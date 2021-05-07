// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IContentSubsystemBase {

    /******** View Functions ********/
    function parent() external view returns (address);
    
    /******** Mutative Functions ********/
    function setParent(address _parent) external;
    
}