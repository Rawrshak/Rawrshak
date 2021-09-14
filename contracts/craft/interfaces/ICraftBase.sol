// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICraftBase { 
    /******** Mutative Functions ********/
    function registerManager(address _manager) external;

    function managerSetPause(bool _setPause) external;
    
    /*********************** Events *********************/
    event ManagerRegistered(address indexed operator, address indexed manager);
}