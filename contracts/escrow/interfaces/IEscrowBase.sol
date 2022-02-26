// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEscrowBase {

    /******** View Functions ********/
    function MANAGER_ROLE() external view returns(bytes32);

    /******** Mutative Functions ********/
     function registerManager(address _manager) external;
}