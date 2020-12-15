// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Crafting.sol";

library CraftingDeployer {
    function deployCrafting(address _itemRegistryAddr) public returns(address crafting) {
        crafting = address(new Crafting(_itemRegistryAddr));
    } 
    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

contract CraftingFactory is ERC165 {
    using ERC165Checker for *;
    using CraftingDeployer for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_ICRAFTINGFACTORY = 0x00000007;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_ICRAFTINGMANAGER= 0x00000006;

    /******** Stored Variables ********/
    address itemRegistryAddr;
    address[] public craftingAddresses;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event CraftingContractCreated(uint256, address, address);

    /******** Public API ********/
    constructor() public {
        _registerInterface(_INTERFACE_ID_ICRAFTINGFACTORY);
    }

    function setGlobalItemRegistryAddr(address _addr) external {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _addr;

        emit GlobalItemRegistryStored(address(this), _addr, _INTERFACE_ID_ICRAFTINGFACTORY);
    }

    /******** Mutative Functions ********/
    function createCraftingContract() external returns(address contractAddr, uint256 contractId) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_ICRAFTINGMANAGER),
            "Caller is not a Crafting Manager Contract."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");

        contractAddr = CraftingDeployer.deployCrafting(itemRegistryAddr);
        CraftingDeployer.transferOwnership(contractAddr, msg.sender);

        contractId = craftingAddresses.length;
        craftingAddresses.push(contractAddr);

        emit CraftingContractCreated(contractId, contractAddr, msg.sender);
    }
}