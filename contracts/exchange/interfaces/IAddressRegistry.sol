// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IAddressRegistry { 
    /******** Mutative Functions ********/
    function registerAddress(bytes4[] calldata _ids, address[] calldata _addresses) external;
    
    function getAddress(bytes4 _id) external view returns(address);
    
    function getAddressWithCheck(bytes4 _id) external view returns(address);
}