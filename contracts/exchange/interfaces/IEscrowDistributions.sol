// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IEscrowDistributions {
    // View functions
    function getClaimableTokensByOwner(address owner) external view returns(uint256); 
    
    // Mutable Functions    
    function deposit(address from, address to, uint256 amount) external;

    function claim(address to) external;

}