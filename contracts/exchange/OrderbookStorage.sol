// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./StorageBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbookStorage.sol";

contract OrderbookStorage is IOrderbookStorage, StorageBase {
    using SafeMathUpgradeable for uint256;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) orders;

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

    function placeOrder(uint256 _id, LibOrder.OrderData memory _order) external override onlyRole(MANAGER_ROLE) { 
        orders[_id] = _order;
    }

    function deleteOrder(uint256 _id) external override onlyRole(MANAGER_ROLE) {
        // Deleting costs 5000, but returns a 15000 gas refund at the end of your call, which will make
        // the overall transaction cheaper, I think.
        delete orders[_id];
    }

    function getOrder(uint256 _id) external view override returns(LibOrder.OrderData memory) {
        return orders[_id];
    }

    function verifyOwner(uint256 _id, address _owner) external view override returns(bool) {
        return orders[_id].owner == _owner;
    }

    function fillOrder(uint256 _id, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        orders[_id].amount = orders[_id].amount.sub(_amount);
    }

    uint256[50] private __gap;

}