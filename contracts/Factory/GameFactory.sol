// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Game.sol";

contract GameFactory is ERC165 {
    using ERC165Checker for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_IGAMEFACTORY = 0x22222222;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;
    bytes4 private constant _INTERFACE_ID_IGAMEMANAGER = 0x0a306cc6;

    /******** Stored Variables ********/
    address itemRegistryAddr;

    /******** Public API ********/
    constructor() public {
        _registerInterface(_INTERFACE_ID_IGAMEFACTORY);
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
    function createGameContract(string calldata _url) external returns(Game) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_IGAMEMANAGER),
            "Caller is not a Game Manager."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");

        Game game = new Game(_url, itemRegistryAddr);
        game.transferOwnership(msg.sender);
        return game;
    }
}