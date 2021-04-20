// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";
// import "../../content/LibRoyalties.sol";

interface IOrderbookStorage {
    // View Functions
    function orderExists(uint256 _orderId) external view returns(bool);

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder)
        external view returns (bool);

    function getOrder(uint256 id) external view returns(LibOrder.OrderData memory);

    function verifyOwner(uint256 id) external view returns(bool);

    // Mutable Functions
    function placeOrder(uint256 id, LibOrder.OrderData memory order) external;

    function deleteOrder(uint256 id) external;

    function fillOrder(uint256 id, uint256 amount) external;
}