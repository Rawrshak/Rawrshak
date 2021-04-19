// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IAddressRegistry { 
    /******** Mutative Functions ********/
    function getAddress(bytes4 _id) external view returns(address);
}