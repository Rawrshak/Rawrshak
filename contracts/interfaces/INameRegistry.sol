// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface INameRegistry {
    function registerName(string calldata name, address addr, uint16 ver) external;
    function getContractDetails(string calldata name) external view returns(address, uint16);
}