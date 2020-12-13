// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Crafting.sol";

contract CraftingFactory is ERC165 {
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_ICRAFTINGFACTORY = 0x33333333;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;
    bytes4 private constant _INTERFACE_ID_ICRAFTINGMANAGER = 0xCCCCCCCC;

    /******** Stored Variables ********/
    address itemRegistryAddr;

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
    }

    /******** Mutative Functions ********/
    function createCraftingContract() external returns(Crafting) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_ICRAFTINGMANAGER),
            "Caller is not a Crafting Manager Contract."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");

        Crafting crafting = new Crafting(itemRegistryAddr);
        crafting.transferOwnership(msg.sender);
        return crafting;
    }
}