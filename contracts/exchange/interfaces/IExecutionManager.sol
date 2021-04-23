// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IExecutionManager { 
    /******** Mutative Functions ********/
    function getToken(bytes4 _token) external view returns(address);

    function getTokenEscrow(bytes4 _token) external view returns(address);

    function getNFTsEscrow() external view returns(address);
    
    function placeBuyOrder(uint256 _orderId, bytes4 _token, address _sender, uint256 _tokenAmount) external;

    function placeSellOrder(uint256 _orderId, address _sender, LibOrder.AssetData memory _asset, uint256 _assetAmount) external;

    function executeBuyOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset,
        bytes4 _token) 
        external;

    function executeSellOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        bytes4 _token)
        external;

    function deleteOrder(uint256 _orderId, address _user, LibOrder.OrderData memory _order) external;

    function claimOrders(address _user, uint256[] calldata _orderIds) external;

    function verifyUserBalance(address _user, bytes4 _token, uint256 amountDue) external view returns(bool);

    function verifyToken(bytes4 _token) external view returns(bool);
}