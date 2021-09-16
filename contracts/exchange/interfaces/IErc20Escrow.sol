// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IErc20Escrow {

    /******** View Functions ********/
    function escrowedTokensByOrder(uint256 _orderId) external view returns(uint256);
    
    function claimableTokensByOwner(address _owner) external view returns(address[] memory tokens, uint256[] memory amounts); 

    function isTokenSupported(address _token) external view returns(bool);

    /******** Mutative Functions ********/
    function addSupportedTokens(address _token) external;

    function deposit(address _token, uint256 _orderId, address _sender, uint256 _amount) external;

    function withdraw(uint256 _orderId, address _user, uint256 _amount) external;
    
    function depositRoyalty(address _token, address _sender, address _owner, uint256 _amount) external;

    function transferRoyalty(uint256 _orderId, address _to, uint256 _amount) external;
    
    function depositPlatformRoyalty(address _token, address _sender, address _feePool, uint256 _amount) external;

    function transferPlatformRoyalty(uint256 _orderId, address _feePool, uint256 _amount) external;

    function claim(address _owner) external;

}