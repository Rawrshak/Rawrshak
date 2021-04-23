// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IEscrowERC20 {
    // View Functions
    function getToken() external view returns(address);
    
    function getEscrowedTokensByOrder(uint256 _orderId) external view returns(uint256);

    // Mutable Functions
    function deposit(uint256 _orderId, address _sender, uint256 _amount) external;

    function withdraw(uint256 _orderId, address _user, uint256 _amount) external;
    
    // View functions
    function getClaimableTokensByOwner(address _owner) external view returns(uint256); 
    
    // Mutable Functions
    function depositRoyalty(address _sender, address _owner, uint256 _amount) external;

    function transferRoyalty(uint256 _orderId, address _to, uint256 _amount) external;

    function claim(address _owner) external;

}