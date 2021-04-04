// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/GameManager.sol";
import "../Game/CraftingManager.sol";
import "../Game/LootboxManager.sol";

library GameManagerDeployer {
    function deployGameManager(address _sender) public returns(address manager) {
        manager = address(new GameManager(_sender));
    }
}

library CraftingManagerDeployer {
    function deployCraftingManager(address _sender) public returns(address manager) {
        manager = address(new CraftingManager(_sender));
    } 
}

library LootboxManagerDeployer {
    function deployLootboxManager(address _sender) public returns(address manager) {
        manager = address(new LootboxManager(_sender));
    } 
}

contract ManagerFactory is ERC165 {
    using ERC165Checker for *;
    using GameManagerDeployer for *;
    using CraftingManagerDeployer for *;
    using LootboxManagerDeployer for *;

    /******** Constants ********/

    /******** Stored Variables ********/
    mapping(address => address[]) public gameManagerAddresses;
    mapping(address => address[]) public craftingManagerAddresses;
    mapping(address => address[]) public lootboxManagerAddresses;
    
    /******** Events ********/
    event GameManagerCreated(uint256, address, address);
    event CraftingManagerCreated(uint256, address, address);
    event LootboxManagerCreated(uint256, address, address);

    /******** Public API ********/
    constructor() public {
        _registerInterface(Constants._INTERFACE_ID_IMANAGERFACTORY);
    }

    /******** Mutative Functions ********/
    function createGameManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = GameManagerDeployer.deployGameManager(msg.sender);
        
        contractId = gameManagerAddresses[msg.sender].length;
        gameManagerAddresses[msg.sender].push(contractAddr);

        emit GameManagerCreated(contractId, contractAddr, msg.sender);
    }
    
    function createCraftingManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = CraftingManagerDeployer.deployCraftingManager(msg.sender);
        
        contractId = craftingManagerAddresses[msg.sender].length;
        craftingManagerAddresses[msg.sender].push(contractAddr);

        emit CraftingManagerCreated(contractId, contractAddr, msg.sender);
    }
    
    function createLootboxManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = LootboxManagerDeployer.deployLootboxManager(msg.sender);
        
        contractId = lootboxManagerAddresses[msg.sender].length;
        lootboxManagerAddresses[msg.sender].push(contractAddr);

        emit LootboxManagerCreated(contractId, contractAddr, msg.sender);
    }
}