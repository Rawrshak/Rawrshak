// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../interfaces/INameRegistry.sol";

contract NameRegistry is INameRegistry {
    struct ContractDetails {
        address owner;
        address contractAddress;
        uint16 version;
    }

    mapping(string => ContractDetails) registry;
    
    function registerName(string calldata _name, address _addr, uint16 _ver) external override {
        require(_ver >= 1, "version >= 1");

        ContractDetails storage info = registry[_name];
        if (info.owner == address(0)) {
            info.owner = msg.sender;
            info.contractAddress = _addr;
            info.version = _ver;
        } else {
            require(info.owner == msg.sender, "sender is not the contract owner");
            require(_ver > info.version, "Invalid version");
            info.contractAddress = _addr;
            info.version = _ver;
        }
    }

    function getContractDetails(string calldata _name) external view override returns(address, uint16) {
        return (registry[_name].contractAddress, registry[_name].version);
    }
}