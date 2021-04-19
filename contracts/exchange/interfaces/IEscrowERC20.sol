// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibOrder.sol";

interface IEscrowERC20 {
    // View Functions
    function getToken() external view returns(address);
    
    function getEscrowedTokensByOrder(uint256 orderId) external view returns(uint256);

    // Mutable Functions
    function deposit(address user, uint256 orderId, uint256 amount) external;

    function withdraw(uint256 orderId, uint256 amount) external;

    function withdraw(address user, uint256 orderId, uint256 amount) external;

}