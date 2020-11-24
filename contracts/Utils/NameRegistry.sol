// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "../interfaces/INameRegistry.sol";

contract NameRegistry is INameRegistry {
    struct ContractDetails {
        address owner;
        address contractAddress;
        uint16 version;
    }

    mapping(string => ContractDetails) registry;
    
    function registerName(string calldata name, address addr, uint16 ver) external override {
        require(ver >= 1, "version >= 1");

        ContractDetails storage info = registry[name];
        if (info.owner == address(0)) {
            info.owner = msg.sender;
            info.contractAddress = addr;
            info.version = ver;
        } else {
            require(info.owner == msg.sender, "sender is not the contract owner");
            require(ver > info.version, "Invalid version");
            info.contractAddress = addr;
            info.version = ver;
        }
    }

    function getContractDetails(string calldata name) external view override returns(address, uint16) {
        return (registry[name].contractAddress, registry[name].version);
    }
}