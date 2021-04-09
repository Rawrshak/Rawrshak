// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Game.sol";

library GameDeployer {
    function deployGame(uint256 /*contractId*/, address /*_itemRegistryAddr*/, string memory /*_url*/) public pure  returns(address game) {
        // Todo: this factory pattern is not feasible anymore because it includes the bytecode of Game, which 
        //       makes GameDeployer go over the max contract size of 24kb
        game = address(0);
        // game = address(new Game(contractId, _url, _itemRegistryAddr));
    } 
    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

contract GameFactory is ERC165Storage {
    using ERC165Checker for *;
    using GameDeployer for *;

    /******** Constants ********/

    /******** Stored Variables ********/
    address itemRegistryAddr;
    address[] public gameAddresses;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event GameContractCreated(uint256 id, address addr, address owner);

    /******** Public API ********/
    constructor() {
        _registerInterface(Constants._INTERFACE_ID_IGAMEFACTORY);
    }

    function setGlobalItemRegistryAddr(address _addr) external {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, Constants._INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _addr;
        
        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_IGAMEFACTORY);
    }

    /******** Mutative Functions ********/
    function createGameContract(string calldata _url) external returns(address contractAddr, uint256 contractId) {
        require(
            ERC165Checker.supportsInterface(msg.sender, Constants._INTERFACE_ID_IGAMEMANAGER),
            "Caller is not a Game Manager."
        );
        require(itemRegistryAddr != address(0), "Global Item registry not set.");

        contractId = gameAddresses.length;
        contractAddr = GameDeployer.deployGame(contractId, itemRegistryAddr, _url);
        GameDeployer.transferOwnership(contractAddr, msg.sender);
        
        gameAddresses.push(contractAddr);

        emit GameContractCreated(contractId, contractAddr, msg.sender);
    }
}