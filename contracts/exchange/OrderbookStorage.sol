// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./StorageBase.sol";
import "./LibOrder.sol";

contract OrderbookStorage is StorageBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) public orders;

    /*********************** Events *********************/
    event OrderFilled(uint256 orderId, uint256 amount);
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __OrderbookStorage_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
    }

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder)
        external view returns (bool) 
    {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (!LibOrder._verifyOrders(orders[_orderIds[i]], _asset, _token, _isBuyOrder)) {
                return false;
            }
        }
        return true;
    }

    function placeOrder(uint256 id, LibOrder.OrderData memory order) external checkPermissions(MANAGER_ROLE) {
        require(orders[id].owner == address(0), "Order already exists");

        orders[id] = order;
    }

    function deleteOrder(uint256 id) external checkPermissions(MANAGER_ROLE) {
        require(orders[id].owner != address(0), "Order doesn't exist");

        delete orders[id];
    }

    function getOrder(uint256 id) external view returns(LibOrder.OrderData memory) {
        return orders[id];
    }

    function verifyOwner(uint256 id) external view returns(bool) {
        return orders[id].owner == _msgSender();
    }

    function fillOrder(uint256 id, uint256 amount) external checkPermissions(MANAGER_ROLE) {
        require(orders[id].owner == address(0), "Order doesn't exists");
        require(orders[id].amount >= amount, "Invalid order amount");
        orders[id].amount = SafeMathUpgradeable.sub(orders[id].amount, amount);

        emit OrderFilled(id, amount);
    }


    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}