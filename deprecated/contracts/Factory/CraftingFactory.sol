// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Crafting.sol";
import "../../utils/Utils.sol";

library CraftingDeployer {
    function deployCrafting(uint256 id, address _itemRegistryAddr) public returns(address crafting) {
        crafting = address(new Crafting(id, _itemRegistryAddr));
    } 
    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

contract CraftingFactory is ERC165Storage {
    using ERC165Checker for *;
    using CraftingDeployer for *;

    /******** Constants ********/

    /******** Stored Variables ********/
    address itemRegistryAddr;
    address[] public craftingAddresses;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event CraftingContractCreated(uint256 id, address addr, address owner);

    /******** Public API ********/
    constructor() {
        _registerInterface(Constants._INTERFACE_ID_ICRAFTINGFACTORY);
    }

    function setGlobalItemRegistryAddr(address _addr) external {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, Constants._INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _addr;

        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_ICRAFTINGFACTORY);
    }

    /******** Mutative Functions ********/
    function createCraftingContract() external returns(address contractAddr, uint256 contractId) {
        require(
            ERC165Checker.supportsInterface(msg.sender, Constants._INTERFACE_ID_ICRAFTINGMANAGER),
            "Caller is not a Crafting Manager Contract."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");

        contractId = craftingAddresses.length;
        contractAddr = CraftingDeployer.deployCrafting(contractId, itemRegistryAddr);
        CraftingDeployer.transferOwnership(contractAddr, msg.sender);

        craftingAddresses.push(contractAddr);

        emit CraftingContractCreated(contractId, contractAddr, msg.sender);
    }
}