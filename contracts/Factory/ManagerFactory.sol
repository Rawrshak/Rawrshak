// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../Game/GameManager.sol";
import "../Game/CraftingManager.sol";
import "../Game/LootboxManager.sol";

library ManagerDeployer {    
    function transferOwnership(address _contractAddr, address _newOwner) public {
        IDatabaseContract(_contractAddr).setManagerAddress(_newOwner);
        Ownable(_contractAddr).transferOwnership(_newOwner);
    }
}

library GameManagerDeployer {
    function deployGameManager() public returns(address manager) {
        manager = address(new GameManager());
    }
}

library CraftingManagerDeployer {
    function deployCraftingManager() public returns(address manager) {
        manager = address(new CraftingManager());
    } 
}

library LootboxManagerDeployer {
    function deployLootboxManager() public returns(address manager) {
        manager = address(new LootboxManager());
    } 
}

contract ManagerFactory is ERC165 {
    using ERC165Checker for *;
    using ManagerDeployer for *;
    using GameManagerDeployer for *;
    using CraftingManagerDeployer for *;
    using LootboxManagerDeployer for *;

    /******** Constants ********/
    bytes4 private constant _INTERFACE_ID_IMANAGERFACTORY = 0x0000000D;

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
        _registerInterface(_INTERFACE_ID_IMANAGERFACTORY);
    }

    /******** Mutative Functions ********/
    function createGameManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = GameManagerDeployer.deployGameManager();
        ManagerDeployer.transferOwnership(contractAddr, msg.sender);
        
        contractId = gameManagerAddresses[msg.sender].length;
        gameManagerAddresses[msg.sender].push(contractAddr);

        emit GameManagerCreated(contractId, contractAddr, msg.sender);
    }
    
    function createCraftingManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = CraftingManagerDeployer.deployCraftingManager();
        ManagerDeployer.transferOwnership(contractAddr, msg.sender);
        
        contractId = craftingManagerAddresses[msg.sender].length;
        craftingManagerAddresses[msg.sender].push(contractAddr);

        emit CraftingManagerCreated(contractId, contractAddr, msg.sender);
    }
    
    function createLootboxManagerContract() external returns(address contractAddr, uint256 contractId) {
        contractAddr = LootboxManagerDeployer.deployLootboxManager();
        ManagerDeployer.transferOwnership(contractAddr, msg.sender);
        
        contractId = lootboxManagerAddresses[msg.sender].length;
        lootboxManagerAddresses[msg.sender].push(contractAddr);

        emit LootboxManagerCreated(contractId, contractAddr, msg.sender);
    }
}