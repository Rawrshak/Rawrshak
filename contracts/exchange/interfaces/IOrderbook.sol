// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IOrderbook { 
    /******** View Functions ********/
    function exists(uint256 _orderId) external view returns(bool);
    
    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder
    ) external view returns (bool);

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view returns(uint256 amountDue, uint256[] memory amountPerOrder);

    function getOrder(uint256 _orderId) external view returns(LibOrder.OrderData memory);

    /******** Mutative Functions ********/
    function placeOrder(LibOrder.OrderData memory _order) external returns(uint256 id);

    function fillOrders(uint256[] memory orderIds, uint256[] memory amounts) external;

    function deleteOrder(uint256 orderId, address owner) external;
}