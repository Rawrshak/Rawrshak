// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibOrder.sol";
// import "../../libraries/LibRoyalties.sol";

interface IOrderbookStorage {
    /******** View Functions ********/
    function orderExists(uint256 _orderId) external view returns(bool);

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder)
        external view returns (bool);

    function getOrder(uint256 _id) external view returns(LibOrder.OrderData memory);

    function verifyOwner(uint256 _id, address _owner) external view returns(bool);

    /******** Mutative Functions ********/
    function placeOrder(uint256 _id, LibOrder.OrderData memory _order) external;

    function deleteOrder(uint256 _id) external;

    function fillOrder(uint256 _id, uint256 _amount) external;
}