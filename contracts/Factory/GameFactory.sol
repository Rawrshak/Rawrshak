// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/Game.sol";

library GameDeployer {
    function deployGame(uint256 contractId, address _itemRegistryAddr, string memory _url) public returns(address game) {
        game = address(new Game(contractId, _url, _itemRegistryAddr));
    } 
    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

contract GameFactory is ERC165 {
    using ERC165Checker for *;
    using GameDeployer for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_IGAMEFACTORY = 0x00000003;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_IGAMEMANAGER = 0x00000002;

    /******** Stored Variables ********/
    address itemRegistryAddr;
    address[] public gameAddresses;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event GameContractCreated(uint256 id, address addr, address owner);

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
        
        emit GlobalItemRegistryStored(address(this), _addr, _INTERFACE_ID_IGAMEFACTORY);
    }

    /******** Mutative Functions ********/
    function createGameContract(string calldata _url) external returns(address contractAddr, uint256 contractId) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_IGAMEMANAGER),
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