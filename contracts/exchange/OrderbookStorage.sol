// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./StorageBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbookStorage.sol";

contract OrderbookStorage is IOrderbookStorage, StorageBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) orders;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __OrderbookStorage_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_ORDERBOOK_STORAGE);
    }

    function orderExists(uint256 _orderId) external view override returns(bool) {
        return orders[_orderId].owner != address(0);
    }

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder)
        external view override returns(bool) 
    {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (!LibOrder._verifyOrders(orders[_orderIds[i]], _asset, _token, _isBuyOrder)) {
                return false;
            }
        }
        return true;
    }

    function placeOrder(uint256 id, LibOrder.OrderData memory order) external override checkPermissions(MANAGER_ROLE) { 
        orders[id] = order;
    }

    function deleteOrder(uint256 id) external override checkPermissions(MANAGER_ROLE) {
        // Deleting costs 5000, but returns a 15000 gas refund at the end of your call, which will make
        // the overall transaction cheaper, I think.
        delete orders[id];
    }

    function getOrder(uint256 id) external view override returns(LibOrder.OrderData memory) {
        return orders[id];
    }

    function verifyOwner(uint256 id, address owner) external view override returns(bool) {
        return orders[id].owner == owner;
    }

    function fillOrder(uint256 id, uint256 amount) external override checkPermissions(MANAGER_ROLE) {
        orders[id].amount = SafeMathUpgradeable.sub(orders[id].amount, amount);
    }


    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}