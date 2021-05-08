// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "./OrderbookStorage.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbookManager.sol";

contract OrderbookManager is IOrderbookManager, ManagerBase {
    
    /***************** Stored Variables *****************/
    uint256 internal orderIdCounter;

    /******************** Public API ********************/
    function __OrderbookManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
        _registerInterface(LibConstants._INTERFACE_ID_ORDERBOOK_MANAGER);
        orderIdCounter = 0;
    }

    /**************** Internal Functions ****************/
    function placeOrder(LibOrder.OrderData memory _order) external override onlyOwner returns(uint256 id){
        id = _generateOrderId(_order.owner, _order.asset.contentAddress, _order.asset.tokenId, orderIdCounter++);

        IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).placeOrder(id, _order);
    }

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder
    ) external view override onlyOwner returns (bool) {
        return IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).verifyOrders(
                _orderIds,
                _asset,
                _token,
                _isBuyOrder);
    }

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view override onlyOwner returns(uint256 amountDue, uint256[] memory amountPerOrder) {
        require(_orderIds.length == _amounts.length, "Invalid Length");

        amountPerOrder = new uint256[](_amounts.length);
        amountDue = 0;
        LibOrder.OrderData memory order;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            order = IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderIds[i]);
            require(order.amount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            
            amountPerOrder[i] = SafeMathUpgradeable.mul(order.price, _amounts[i]);
            amountDue = SafeMathUpgradeable.add(amountDue, amountPerOrder[i]);
        }
    } 

    function fillOrders(uint256[] memory orderIds, uint256[] memory amounts) external override onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        require(orderIds.length == amounts.length, "Invalid input lengths");

        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < orderIds.length; ++i) {
            IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).fillOrder(orderIds[i], amounts[i]);
        }
    }

    function deleteOrder(uint256 orderId, address owner) external override onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        // the caller will already fill in the orders up to the amount. 
        require(
            IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).verifyOwner(orderId, owner),
            "Invalid order owner."
        );

        IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).deleteOrder(orderId);
    }

    function getOrder(uint256 _orderId) external view override returns(LibOrder.OrderData memory) {
        return IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderId);
    }

    function orderExists(uint256 _orderId) external view override returns(bool){
        return IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).orderExists(_orderId);
    }
    
    /**************** Internal Functions ****************/
    function _generateOrderId(address _user, address _tokenAddr, uint256 _tokenId, uint256 _orderIdCounter) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_user, _tokenAddr, _tokenId, _orderIdCounter)));
    }
    
    uint256[50] private __gap;
}