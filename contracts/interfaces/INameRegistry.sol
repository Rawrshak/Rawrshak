// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface INameRegistry {
    function registerName(string calldata _name, address _addr, uint16 _ver) external;
    function getContractDetails(string calldata _name) external view returns(address, uint16);
}