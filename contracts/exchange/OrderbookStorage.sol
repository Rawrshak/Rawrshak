// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./LibOrder.sol";

contract OrderbookStorage is OwnableUpgradeable {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) orders;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __OrderbookStorage_init() public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
    }

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        address _tokenAddr,
        uint256 _maxPrice,
        bool _isBuyOrder)
        external view returns (bool) 
    {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (!LibOrder._verifyOrders(orders[_orderIds[i]], _asset, _tokenAddr, _maxPrice, _isBuyOrder)) {
                return false;
            }
        }
        return true;
    }

    function placeOrder(uint256 id, LibOrder.OrderData memory order) external onlyOwner {
        require(orders[id].owner == address(0), "Order already exists");

        orders[id] = order;
    }

    function deleteOrder(uint256 id) external onlyOwner {
        require(orders[id].owner != address(0), "Order doesn't exist");

        delete orders[id];
    }

    function getOrderAsset(uint256 id) external view onlyOwner returns(LibOrder.AssetData memory) {
        return orders[id].asset;
    }

    function getOrderOwner(uint256 id) external view onlyOwner returns(address) {
        return orders[id].owner;
    }

    function getOrderPrice(uint256 id) external view onlyOwner returns(address, uint256) {
        return (orders[id].tokenAddr, orders[id].price);
    }

    function getOrderAmount(uint256 id) external view onlyOwner returns(uint256) {
        return orders[id].amount;
    }

    function isBuyOrder(uint256 id) external view onlyOwner returns(bool) {
        return orders[id].isBuyOrder;
    }

    function fillOrder(uint256 id, uint256 amount) external onlyOwner {
        require(orders[id].owner == address(0), "Order doesn't exists");
        require(orders[id].amount >= amount, "Invalid order amount");
        orders[id].amount = SafeMathUpgradeable.sub(orders[id].amount, amount);

        if (orders[id].amount == 0) {
            delete orders[id];
        }
    }


    /**************** Internal Functions ****************/

}