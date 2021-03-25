// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
// pragma experimental ABIEncoderV2; // to make EnumerableSet.UintSet a getter function
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IGameManager.sol";
import "../interfaces/ICrafting.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../tokens/TokenBase.sol";
import "../utils/Constants.sol";

// Todo: Single Game Crafting Contract: more efficient for single game contracts
// Todo: Multi-Game Crafting Contract
// Todo: Update all INTERFACE IDs
// Todo: Update All events in preparation for The Graph Indexing

contract Crafting is ICrafting, Ownable, ERC165 {
    using EnumerableSet for EnumerableSet.UintSet;
    using ERC165Checker for *;

    /******** Constants ********/
    /*
     *     bytes4(keccak256('isRecipeActive(uint256)')) == 0x4e22a7bd
     *     bytes4(keccak256('getTokenAddressForCrafting()')) == 0x2d7d6043
     *     bytes4(keccak256('getRecipeCost(uint256)')) == 0x7352706d
     *     bytes4(keccak256('getCraftingMaterialsList(uint256)')) == 0x1f728011
     *     bytes4(keccak256('getRewardsList(uint256)')) == 0xb9653829
     *     bytes4(keccak256('getItemAsCraftingMaterialList(uint256)')) == 0xb0d26341
     *     bytes4(keccak256('getItemAsRewardList(uint256)')) == 0x7bb901d1
     *     bytes4(keccak256('getActiveRecipes()')) == 0x345964c9
     *     bytes4(keccak256('getActiveRecipeCount()')) == 0x1564aed9
     *     bytes4(keccak256('createRecipe(uint256[],uint256[],uint256[],uint256[],uin256,bool)')) == 0xc2592024
     *     bytes4(keccak256('setRecipeActive(uin256,bool)')) == 0x26f0021d
     *     bytes4(keccak256('setRecipeActiveBatch(uint256[],bool[])')) == 0x5c5e19b7
     *     bytes4(keccak256('updateRecipeCost(uint256,uint256)')) == 0xfd317879
     *     bytes4(keccak256('updateRecipeCostBatch(uint256[],uint256[])')) == 0x142695d8
     *     bytes4(keccak256('craftItem(uint256,address)')) == 0x66b3f13e
     *
     *     => 0x4e22a7bd ^ 0x2d7d6043 ^ 0x7352706d ^ 0x1f728011
     *      ^ 0xb9653829 ^ 0xb0d26341 ^ 0x7bb901d1 ^ 0x345964c9
     *      ^ 0x1564aed9 ^ 0xc2592024 ^ 0x26f0021d ^ 0x5c5e19b7
     *      ^ 0xfd317879 ^ 0x142695d8 ^ 0x66b3f13e == 0x6b1f803a
     */
        
    /******** Data Structures ********/
    struct Recipe {
        uint256 recipeId;
        mapping(uint256 => uint256) materials;
        mapping(uint256 => uint256) rewards;
        EnumerableSet.UintSet materialIds;
        EnumerableSet.UintSet rewardIds;
        address tokenAddr;
        uint256 cost;
        bool isActive;
    }

    /******** Stored Variables ********/
    mapping(uint256 => Recipe) private recipes;
    uint256 recipesCount;
    uint256 public activeRecipeCount = 0;
    address private globalItemRegistryAddr;
    address private craftingManagerAddr;
    address payable private developerWallet;
    uint256 public craftingId;

    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event CraftingManagerSet(uint256 id, address addr);
    event ItemCrafted(uint256 id, uint256 recipeId, address owner);
    event RecipeCreated(uint256 id, uint256 recipeId);
    event RecipeMaterialsUpdated(uint256 id, uint256 recipeId, uint256[] materialIds, uint256[] amounts);
    event RecipeRewardsUpdated(uint256 id, uint256 recipeId, uint256[] rewardsId, uint256[] amounts);
    event RecipeActiveSet(uint256 id, uint256 recipeId, bool isActive);
    event RecipeCostUpdated(uint256 id, uint256 recipeId, address tokenAddress, uint256 cost);

    /******** Modifiers ********/
    modifier checkItemExists(uint256 _uuid) {
        require(globalItemRegistry().contains(_uuid), "Item does not exist.");
        _;
    }

    /******** Public API ********/
    constructor(uint256 _id, address _addr) public {
        require(
            ERC165Checker.supportsInterface(msg.sender, Constants._INTERFACE_ID_ICRAFTINGFACTORY),
            "Caller does not support Interface."
        );
        craftingId = _id;
        globalItemRegistryAddr = _addr;
        _registerInterface(Constants._INTERFACE_ID_ICRAFTING);
    }

    function setGlobalItemRegistryAddr(address _addr) external override onlyOwner {
        // Address is already checked in the game manager
        globalItemRegistryAddr = _addr;
        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_ICRAFTING);
    }

    function setManagerAddress(address _addr) external override onlyOwner {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, Constants._INTERFACE_ID_ICRAFTINGMANAGER),
            "Caller does not support Interface."
        );
        craftingManagerAddr = _addr;
        emit CraftingManagerSet(craftingId, _addr);
    }
    
    function setDeveloperWallet(address payable _wallet) external override onlyOwner {
        developerWallet = _wallet;
    }

    function getManagerAddress() external view override returns(address) {
        return craftingManagerAddr;
    }

    function generateNextRecipeId() external override view onlyOwner returns(uint256)
    {
        return recipesCount;
    }

    function createRecipe(uint256 _recipeId) external override onlyOwner {
        // The recipes do not get deleted so the recipe id counter is only ever incremented;
        recipes[_recipeId].recipeId = _recipeId;
        recipesCount++;

        emit RecipeCreated(craftingId, _recipeId);
    }

    function updateMaterialsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _materialUuids,
        uint256[] calldata _materialAmounts
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _materialUuids.length; ++i) {
             // EnumerableSet.add() is a no-op if id already exists
            recipes[_recipeId].materialIds.add(_materialUuids[i]);
            recipes[_recipeId].materials[_materialUuids[i]] = _materialAmounts[i];

            if (_materialAmounts[i] == 0) {
                // Item is deleted from the recipe
                recipes[_recipeId].materialIds.remove(_materialUuids[i]);
            }
        }

        // if the recipe was active and the materials were all deleted, deactivate the recipe
        if (recipes[_recipeId].materialIds.length() == 0 && recipes[_recipeId].isActive) {
            recipes[_recipeId].isActive = false;
            activeRecipeCount--;
        }
        
        emit RecipeMaterialsUpdated(craftingId, _recipeId, _materialUuids, _materialAmounts);
    }

    function updateRewardsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _rewardUuids,
        uint256[] calldata _rewardAmounts
    )
        external
        override
        onlyOwner
    {
        for (uint256 i = 0; i < _rewardUuids.length; ++i) {
             // EnumerableSet.add() is a no-op if id already exists
            recipes[_recipeId].rewardIds.add(_rewardUuids[i]);
            recipes[_recipeId].rewards[_rewardUuids[i]] = _rewardAmounts[i];

            if (_rewardAmounts[i] == 0) {
                // Item is deleted from the recipe
                recipes[_recipeId].rewardIds.remove(_rewardUuids[i]);
            }
        }

        // if the recipe was active and the rewards were all deleted, deactivate the recipe
        if (recipes[_recipeId].rewardIds.length() == 0 && recipes[_recipeId].isActive) {
            recipes[_recipeId].isActive = false;
            activeRecipeCount--;
        }
        emit RecipeRewardsUpdated(craftingId, _recipeId, _rewardUuids, _rewardAmounts);
    }

    function updateRecipeActive(uint256 _recipeId, bool _activate) 
        external
        override
        onlyOwner
    {
        if (recipes[_recipeId].isActive == _activate) {
            // no-op
            return;
        }

        recipes[_recipeId].isActive = _activate;
        if (_activate) {
            activeRecipeCount++;
        } else {
            activeRecipeCount--;
        }
        emit RecipeActiveSet(craftingId, _recipeId, _activate);
    }

    function updateRecipeCost(uint256 _recipeId, address _tokenAddr, uint256 _cost)
        external
        override
        onlyOwner
    {
        recipes[_recipeId].tokenAddr = _tokenAddr;
        recipes[_recipeId].cost = _cost;
        emit RecipeCostUpdated(craftingId, _recipeId, _tokenAddr, _cost);
    }
    
    function exists(uint256 _recipeId) external override view returns(bool)
    {
        return _recipeId < recipesCount;
    }

    function craftItem(uint256 _recipeId, address payable _account)
        external
        override
    {
        require(_recipeId < recipesCount, "Recipe does not exist.");
        require(recipes[_recipeId].isActive, "Recipe is not active.");
        require(developerWallet != address(0), "Developer wallet not set.");
        
        Recipe storage recipe = recipes[_recipeId];

        if (recipe.cost > 0) {
            // This will fail if the account doesn't have enough to cover the 
            // cost of crafting this item
            // Todo: replace this with ERC20
            TokenBase(recipe.tokenAddr).transferFrom(_account, developerWallet, recipe.cost);
        }
        
        IGlobalItemRegistry registry = globalItemRegistry();

        // local variables so no need to reallocate for each material
        uint256 uuid;
        IGameManager gameManager;

        // Burns the materials in the game contract
        for (uint256 i = 0; i < recipe.materialIds.length(); ++i) {
            // Get game information
            uuid = recipe.materialIds.at(i);
            (, address gameManagerAddr, uint256 gameId) = registry.getItemInfo(uuid);
            gameManager = IGameManager(gameManagerAddr);

            // Burn() will fail if this contract does not have the necessary 
            // permissions or if the account does not have enough materials
            gameManager.burn(_account, gameId, recipe.materials[uuid]);
        }

        // Mint Reward
        for (uint256 i = 0; i < recipe.rewardIds.length(); ++i) {
            // Get game information
            uuid = recipe.rewardIds.at(i);
            (, address gameManagerAddr, uint256 gameId) = registry.getItemInfo(uuid);
            gameManager = IGameManager(gameManagerAddr);

            // Mint() will fail if this contract does not have the necessary 
            // permissions 
            gameManager.mint(_account, gameId, recipe.rewards[uuid]);
        }

        // Notify user of item getting crafted
        emit ItemCrafted(craftingId, _recipeId, _account);
    }

    function isRecipeActive(uint256 _recipeId) external view override returns(bool) {
        return recipes[_recipeId].isActive;
    }

    function getRecipeCost(uint256 _recipeId) external view override returns(address, uint256) {
        return (recipes[_recipeId].tokenAddr, recipes[_recipeId].cost);
    }
    
    // Gets materials list for the recipe
    // Returns: (crafting item id, amount) list
    function getCraftingMaterialsList(uint256 _recipeId)
        external
        view
        override
        returns(uint256[] memory uuids, uint256[] memory counts)
    {
        require(_recipeId < recipesCount, "Recipe does not exist.");

        Recipe storage recipe = recipes[_recipeId];
        uuids = new uint256[](recipe.materialIds.length());
        counts = new uint256[](recipe.materialIds.length());

        for (uint i = 0; i < recipe.materialIds.length(); ++i) {
            uuids[i] = recipe.materialIds.at(i);
            counts[i] = recipe.materials[recipe.materialIds.at(i)];
        }
    }
    
    // Gets rewards list for the recipe
    // Returns: (crafting item id, amount) list
    function getRewardsList(uint256 _recipeId)
        external
        view
        override
        returns(uint256[] memory uuids, uint256[] memory counts)
    {
        require(_recipeId < recipesCount, "Recipe does not exist.");

        Recipe storage recipe = recipes[_recipeId];
        uuids = new uint256[](recipe.rewardIds.length());
        counts = new uint256[](recipe.rewardIds.length());
        
        for (uint i = 0; i < recipe.rewardIds.length(); ++i) {
            uuids[i] = recipe.rewardIds.at(i);
            counts[i] = recipe.rewards[recipe.rewardIds.at(i)];
        }
    }

    function getActiveRecipeCount() external view override returns(uint256) {
        return activeRecipeCount;
    }

    /******** Internal Functions ********/
    
    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
}