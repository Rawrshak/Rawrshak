// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IOrderbook { 
    /******** View Functions ********/
    function exists(uint256 _orderId) external view returns(bool);
    
    function ordersLength() external view returns(uint256);
    
    function verifyOrdersExist(
        uint256[] memory _orderIds
    ) external view returns (bool);

    function verifyAllOrdersData(
        uint256[] memory _orderIds,
        bool _isBuyOrder
    ) external view returns (bool);

    function verifyOrderOwners(
        uint256[] memory _orderIds,
        address _owner
    ) external view returns (bool);

    function verifyOrdersReady(uint256[] memory _orderIds) external view returns (bool);

    function getOrderAmounts(
        uint256[] memory _orderIds,
        uint256 amountToFill,
        uint256 maxSpend
    ) external view returns(uint256[] memory orderAmounts, uint256 amountFilled);

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view returns(uint256 volume, uint256[] memory amountPerOrder);

    function getOrder(uint256 _orderId) external view returns(LibOrder.Order memory);

    /******** Mutative Functions ********/
    function placeOrder(LibOrder.OrderInput memory _order) external returns(uint256 id);

    function fillOrders(uint256[] memory _orderIds, uint256[] memory _amounts) external;

    function cancelOrders(uint256[] memory _orderIds) external;

    function claimOrders(uint256[] memory _orderIds) external;
}