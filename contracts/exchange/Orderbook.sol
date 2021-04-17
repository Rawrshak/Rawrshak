// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";

abstract contract Orderbook is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    uint256 orderIdCounter;

    /*********************** Events *********************/
    event OrderPlaced(uint256 id, LibOrder.OrderData order);
    event OrdersFilled(LibOrder.AssetData asset, uint256[] orderIds, address tokenAddr, uint256 totalAmount);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Orderbook_init_unchained() public initializer {
        orderIdCounter = 0;
    }

    /**************** Internal Functions ****************/
    function _placeOrder(uint256 _id, LibOrder.OrderData memory _order) internal {
        require(_order.owner == _msgSender(), "Invalid sender.");
        require(_order.owner != address(0) || 
                _order.tokenAddr != address(0) || 
                _order.asset.contentAddress != address(0),
                "Invalid Address.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");
        require(contracts[ORDERBOOK_STORAGE_CONTRACT] != address(0), "Orderbook Contract is not yet set");

        OrderbookStorage(contracts[ORDERBOOK_STORAGE_CONTRACT]).placeOrder(_id, _order);
        emit OrderPlaced(_id, _order);
    }

    function _verifyOrders(uint256[] memory orderIds, LibOrder.AssetData memory asset, address tokenAddr, bool isBuyOrder) internal view returns (bool) {
        require(contracts[ORDERBOOK_STORAGE_CONTRACT] != address(0), "Orderbook Contract is not yet set");
        return OrderbookStorage(contracts[ORDERBOOK_STORAGE_CONTRACT]).verifyOrders(
                orderIds,
                asset,
                tokenAddr,
                isBuyOrder);
    }

    function _fillOrders(uint256[] memory orderIds, uint256[] memory amounts) internal {
        // If we get to this point, the orders in the list of order ids have already been verified.
        require(contracts[ORDERBOOK_STORAGE_CONTRACT] != address(0), "Orderbook Contract is not yet set");
        require(orderIds.length != amounts.length, "Orderbook Contract is not yet set");

        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < orderIds.length; ++i) {
            OrderbookStorage(contracts[ORDERBOOK_STORAGE_CONTRACT]).fillOrder(orderIds[i], amounts[i]);
        }
        
        // call _verifyOrders
        // Get total price, check if user can pay for it
        // if they can pay for it, distribute the tokens to the owners in escrow
        // escrow.transfer() for each order
        // claim batch();
    }

    function _deleteOrders(uint256 orderId) internal {
        // If we get to this point, the orders in the list of order ids have already been verified.
        require(contracts[ORDERBOOK_STORAGE_CONTRACT] != address(0), "Orderbook Contract is not yet set");

        // the caller will already fill in the orders up to the amount. 
        OrderbookStorage(contracts[ORDERBOOK_STORAGE_CONTRACT]).deleteOrder(orderId);
    }
    
    function _generateOrderId(address _user, address _tokenAddr, uint256 _tokenId) internal returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_user, _tokenAddr, _tokenId, orderIdCounter++)));
    }
    
    uint256[50] private __gap;
}