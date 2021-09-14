// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IContentSubsystemBase {
    event ParentSet(address parent);

    /******** View Functions ********/
    function parent() external view returns (address);
    
    /******** Mutative Functions ********/
    function setParent(address _parent) external;
    
}