// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";

contract OrderbookManager is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    uint256 orderIdCounter;

    /*********************** Events *********************/
    event OrderPlaced(uint256 id, LibOrder.OrderData order);
    event OrdersFilled(LibOrder.AssetData asset, uint256[] orderIds, address tokenAddr, uint256 totalAmount);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Orderbook_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ExchangeBase_init_unchained(_registry);
        orderIdCounter = 0;
    }

    /**************** Internal Functions ****************/
    function placeOrder(LibOrder.OrderData memory _order) external onlyOwner returns(uint256 id){
        id = _generateOrderId(_order.owner, _order.asset.contentAddress, _order.asset.tokenId);

        OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).placeOrder(id, _order);
        emit OrderPlaced(id, _order);
    }

    function verifyOrders(uint256[] memory orderIds, LibOrder.AssetData memory asset, address tokenAddr, bool isBuyOrder) external view onlyOwner returns (bool) {
        return OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).verifyOrders(
                orderIds,
                asset,
                tokenAddr,
                isBuyOrder);
    }

    function getPaymentTotals(uint256[] calldata _orderIds, uint256[] calldata _amounts) external view onlyOwner returns(uint256 amountDue, uint256[] memory amountPerOrder) {
        require(_orderIds.length == _amounts.length, "Invalid Length");

        amountPerOrder = new uint256[](_amounts.length);
        amountDue = 0;
        LibOrder.OrderData memory order;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            order = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderIds[i]);
            require(order.amount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            
            amountPerOrder[i] = SafeMathUpgradeable.mul(order.price, _amounts[i]);
            amountDue = SafeMathUpgradeable.add(amountDue, amountPerOrder[i]);
        }
    } 

    function fillOrders(uint256[] memory orderIds, uint256[] memory amounts) external onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        require(orderIds.length != amounts.length, "Orderbook Contract is not yet set");

        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < orderIds.length; ++i) {
            OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).fillOrder(orderIds[i], amounts[i]);
        }
    }

    function deleteOrder(uint256 orderId) external onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        // the caller will already fill in the orders up to the amount. 
        require(
            OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderOwner(orderId) == _msgSender(),
            "Invalid order owner."
        );

        OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).deleteOrder(orderId);
    }

    function getOrder(uint256 _orderId) external view returns(LibOrder.OrderData memory) {
        return OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderId);
    }
    
    function _generateOrderId(address _user, address _tokenAddr, uint256 _tokenId) internal returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_user, _tokenAddr, _tokenId, orderIdCounter++)));
    }
    
    uint256[50] private __gap;
}