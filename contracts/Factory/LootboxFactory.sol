// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Lootbox.sol";

contract LootboxFactory is ERC165 {
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A;

    /******** Stored Variables ********/
    address itemRegistryAddr;

    /******** Public API ********/
    constructor() public {
        _registerInterface(_INTERFACE_ID_ILOOTBOXFACTORY);
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
    function createLootboxContract(string calldata _url) external returns(Lootbox) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_ILOOTBOXMANAGER),
            "Caller is not a Lootbox Manager Contract."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");
        
        Lootbox lootbox = new Lootbox(itemRegistryAddr, _url);
        lootbox.transferOwnership(msg.sender);
        return lootbox;
    }
}