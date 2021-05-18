// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ICraftBase { 
    /******** Mutative Functions ********/
    function registerManager(address _manager) external;

    function registerContent(address _content) external;

    function managerSetPause(bool _setPause) external;
}