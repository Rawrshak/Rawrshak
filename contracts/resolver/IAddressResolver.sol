// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAddressResolver { 

    /******** View Functions ********/
    function getAddress(bytes4 _id) external view returns(address);
    
    function getAddressWithCheck(bytes4 _id) external view returns(address);
    
    /******** Mutative Functions ********/
    function registerAddress(bytes4[] calldata _ids, address[] calldata _addresses) external;
    
    /*********************** Events *********************/
    event AddressRegistered(bytes4 indexed id, address indexed contractAddress);
}
    
