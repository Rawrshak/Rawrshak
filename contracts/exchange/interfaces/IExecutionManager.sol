// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IExecutionManager { 
    /******** Mutative Functions ********/
    function placeBuyOrder(uint256 _orderId, bytes4 _token, uint256 _tokenAmount) external;

    function placeSellOrder(uint256 _orderId, LibOrder.AssetData memory _asset, uint256 _assetAmount) external;

    function executeBuyOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset,
        bytes4 _token) 
        external;

    function executeSellOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        bytes4 _token)
        external;

    function deleteOrder(uint256 _orderId) external;

    function claimOrders(uint256[] calldata _orderIds) external;

    function verifyUserBalance(bytes4 _token, uint256 amountDue) external view returns(bool);

    function verifyToken(bytes4 _token) external view returns(bool);
}