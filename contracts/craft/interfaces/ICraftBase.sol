// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ICraftBase { 
    /******** Mutative Functions ********/
    function registerManager(address _manager) external;

    function managerSetPause(bool _setPause) external;
    
    /*********************** Events *********************/
    event ManagerRegistered(address indexed operator, address indexed manager);
}