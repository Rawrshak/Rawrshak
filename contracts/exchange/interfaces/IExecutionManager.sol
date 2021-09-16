// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IExecutionManager { 
    /******** View Functions ********/

    function tokenEscrow() external view returns(address);

    function nftsEscrow() external view returns(address);

    function verifyToken(address _token) external view returns(bool);

    /******** Mutative Functions ********/
    
    function placeBuyOrder(uint256 _orderId, address _token, address _sender, uint256 _tokenAmount) external;

    function placeSellOrder(uint256 _orderId, address _sender, LibOrder.AssetData memory _asset, uint256 _assetAmount) external;

    function executeBuyOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset) 
        external;

    function executeSellOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        address _token)
        external;

    function cancelOrders(uint256[] memory _orderIds) external;

    function claimOrders(address _user, uint256[] calldata _orderIds) external;
    
    function addSupportedToken(address _token) external;
}