// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IGame.sol";
import "../interfaces/ICrafting.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../tokens/TokenBase.sol";

// Todo: Single Game Crafting Contract: more efficient for single game contracts
// Todo: Multi-Game Crafting Contract
// Todo: Recipe Storage 

contract Crafting is ICrafting, Ownable, AccessControl, ERC165 {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using ERC165Checker for *;

    /******** Constants ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant SMITH_ROLE = keccak256("SMITH_ROLE");

    /*
     *     bytes4(keccak256('isRecipeActive(uint256)')) == 0x4e22a7bd
     *     bytes4(keccak256('getTokenAddressForCrafting()')) == 0x2d7d6043
     *     bytes4(keccak256('getRecipeCost(uint256)')) == 0x7352706d
     *     bytes4(keccak256('getCraftingMaterialsList(uint256)')) == 0x1f728011
     *     bytes4(keccak256('getRewardsList(uint256)')) == 0xb9653829
     *     bytes4(keccak256('getItemAsCraftingMaterialList(uint256)')) == 0xb0d26341
     *     bytes4(keccak256('getItemAsRewardList(uint256)')) == 0x7bb901d1
     *     bytes4(keccak256('getActiveRecipes()')) == 0x345964c9
     *     bytes4(keccak256('getActiveRecipesCount()')) == 0x1564aed9
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
    bytes4 private constant _INTERFACE_ID_ICRAFTING = 0x6b1f803a;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;
    bytes4 private constant _INTERFACE_ID_TOKENBASE = 0xdd0390b5;
    
    /******** Data Structures ********/
    struct ItemPair {
        uint256 uuid;
        uint256 count;
    }
    struct Recipe {
        uint256 recipeId;
        ItemPair[] materials;
        ItemPair[] rewards;
        uint256 cost;
        bool isActive;
    }

    struct CraftItem {
        EnumerableSet.UintSet recipesAsMaterial;
        EnumerableSet.UintSet recipesAsReward;
    }

    /******** Stored Variables ********/
    Recipe[] private recipeList;
    uint256 public activeRecipesCount = 0;
    mapping(uint256 => CraftItem) private craftItems;
    address tokenContractAddress;
    address globalItemRegistryAddr;

    /******** Events ********/
    // // Todo: AddedCraftingItemBatch()
    // // event AddedCraftingItem(uint256);
    event RecipeCreated(uint256);
    event ItemCrafted();

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 _role) {
        require(
            hasRole(_role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    modifier checkItemExists(uint256 _uuid) {
        require(globalItemRegistry().contains(_uuid), "Item does not exist.");
        _;
    }

    /******** Public API ********/
    constructor(address _coinAddress, address _itemRegistryAddr) public {
        require(Address.isContract(_coinAddress), "Address not valid");
        require(Address.isContract(_itemRegistryAddr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_coinAddress, _INTERFACE_ID_TOKENBASE),
            "Caller does not support IGame Interface."
        );
        require(
            ERC165Checker.supportsInterface(_itemRegistryAddr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support IGame Interface."
        );
        tokenContractAddress = _coinAddress;
        globalItemRegistryAddr = _itemRegistryAddr;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _registerInterface(_INTERFACE_ID_ICRAFTING);
    }

    function setGlobalItemRegistryAddr(address _addr)
        public
        checkPermissions(MANAGER_ROLE)
    {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support IGame Interface."
        );
        globalItemRegistryAddr = _addr;
    }

    function createRecipe(
        uint256[] calldata _materialUuids,
        uint256[] calldata _materialAmounts,
        uint256[] calldata _rewardUuids,
        uint256[] calldata _rewardAmounts,
        uint256 _cost,
        bool _isActive
    )
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(
            _materialUuids.length == _materialAmounts.length,
            "Materials lists do not match."
        );
        require(
            _rewardUuids.length == _rewardAmounts.length,
            "Rewards lists do not match."
        );

        // The recipes do not get deleted so the recipe id counter is only ever 
        // incremented;
        uint256 recipeId = recipeList.length;
        Recipe storage recipe = recipeList.push();
        recipe.recipeId = recipeId;
        recipe.cost = _cost;
        recipe.isActive = _isActive;
        if (_isActive) {
            activeRecipesCount++;
        }

        // Iterate through Materials List
        for (uint256 i = 0; i < _materialUuids.length; ++i) {
            require(globalItemRegistry().contains(_materialUuids[i]), "Item does not exist.");

            // Add to crafting materials list
            ItemPair memory pair;
            pair.uuid = _materialUuids[i];
            pair.count = _materialAmounts[i];
            recipe.materials.push(pair);

            // Add recipe to crafting material's recipe list
            craftItems[pair.uuid].recipesAsMaterial.add(recipeId);
        }

        // Iterate through Rewards List
        for (uint256 i = 0; i < _rewardUuids.length; ++i) {
            require(globalItemRegistry().contains(_rewardUuids[i]), "Item does not exist.");
            
            // Add to crafting rewards list
            ItemPair memory pair;
            pair.uuid = _rewardUuids[i];
            pair.count = _rewardAmounts[i];
            recipe.rewards.push(pair);
            
            // Add recipe to crafting reward's recipe list
            craftItems[pair.uuid].recipesAsReward.add(recipeId);
        }

        emit RecipeCreated(recipeId);
    }

    function setRecipeActive(uint256 _recipeId, bool _activate) 
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        _setActiveRecipe(_recipeId, _activate);
    }

    function setRecipeActiveBatch(uint256[] calldata _recipeIds, bool[] calldata _activate)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(_recipeIds.length == _activate.length, "Input array lengths do not match");

        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            _setActiveRecipe(_recipeIds[i], _activate[i]);
        }
    }

    function isRecipeActive(uint256 _recipeId) external view override returns(bool) {
        return recipeList[_recipeId].isActive;
    }

    function updateRecipeCost(uint256 _recipeId, uint256 _cost)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        recipeList[_recipeId].cost = _cost;
    }

    function updateRecipeCostBatch(uint256[] calldata _recipeIds, uint256[] calldata _costs)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(_recipeIds.length == _costs.length, "Input array lengths do not match");

        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            recipeList[_recipeIds[i]].cost = _costs[i];
        }
    }

    function getRecipeCost(uint256 _recipeId) external view override returns(uint256) {
        return recipeList[_recipeId].cost;
    }

    function getTokenAddressForCrafting() external view override returns(address)
    {
        return tokenContractAddress;
    }

    // Gets materials list for the recipe
    // Returns: (crafting item id, amount) list
    function getCraftingMaterialsList(uint256 _recipeId)
        external
        view
        override
        returns(uint256[] memory uuids, uint256[] memory counts)
    {
        require(_recipeId < recipeList.length, "Recipe does not exist.");

        Recipe storage recipe = recipeList[_recipeId];
        uuids = new uint256[](recipe.materials.length);
        counts = new uint256[](recipe.materials.length);

        for (uint i = 0; i < recipe.materials.length; ++i) {
            ItemPair storage itemPair = recipe.materials[i];
            uuids[i] = itemPair.uuid;
            counts[i] = itemPair.count;
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
        require(_recipeId < recipeList.length, "Recipe does not exist.");

        Recipe storage recipe = recipeList[_recipeId];
        uuids = new uint256[](recipe.rewards.length);
        counts = new uint256[](recipe.rewards.length);
        for (uint i = 0; i < recipe.rewards.length; ++i) {
            ItemPair storage itemPair = recipe.rewards[i];
            uuids[i] = itemPair.uuid;
            counts[i] = itemPair.count;
        }
    }

    // List of recipes where id is a material
    // returns recipe id list
    function getItemAsCraftingMaterialList(uint256 _uuid)
        external
        view
        override
        checkItemExists(_uuid)
        returns(uint256[] memory recipeIds)
    {
        recipeIds = new uint256[](craftItems[_uuid].recipesAsMaterial.length());
        for (uint i = 0; i < craftItems[_uuid].recipesAsMaterial.length(); ++i) {
            recipeIds[i] = craftItems[_uuid].recipesAsMaterial.at(i);
        }
    }
    
    // List of recipes where item is a reward
    // returns recipe id list
    function getItemAsRewardList(uint256 _uuid)
        external
        view
        override
        checkItemExists(_uuid)
        returns(uint256[] memory recipeIds)
    {
        recipeIds = new uint256[](craftItems[_uuid].recipesAsReward.length());
        for (uint i = 0; i < craftItems[_uuid].recipesAsReward.length(); ++i) {
            recipeIds[i] = craftItems[_uuid].recipesAsReward.at(i);
        }
    }

    // List of all active Recipes
    // returns recipe id list
    function getActiveRecipes() external view override returns(uint256[] memory recipeIds)
    {
        if (activeRecipesCount == 0) {
            return recipeIds;
        }

        recipeIds = new uint256[](activeRecipesCount);
        uint256 activeRecipeIterator = 0;

        for (uint i = 0; i < recipeList.length; ++i) {
            // only return active recipes
            if (recipeList[i].isActive)
            {
                recipeIds[activeRecipeIterator++] = recipeList[i].recipeId;
            }
        }
        
        // all active recipes were added to the list
        require(activeRecipeIterator == activeRecipesCount);
    }

    function getActiveRecipesCount() external view override returns(uint256)
    {
        return activeRecipesCount;
    }

    function craftItem(uint256 _recipeId, address payable _account)
        external
        override
        checkPermissions(SMITH_ROLE)
    {
        require(_recipeId < recipeList.length, "Recipe does not exist.");
        require(recipeList[_recipeId].isActive, "Recipe is not active.");
        
        Recipe storage recipe = recipeList[_recipeId];

        if (recipe.cost > 0) {
            // This will fail if the account doesn't have enough to cover the 
            // cost of crafting this item
            TokenBase token = TokenBase(tokenContractAddress);
            token.transferFrom(_account, owner(), recipe.cost);
        }
        
        IGlobalItemRegistry registry = globalItemRegistry();

        // Burns the materials in the game contract
        for (uint256 i = 0; i < recipe.materials.length; ++i) {
            // Get game information
            (address gameAddr, uint256 gameId) = registry.getItemInfo(recipe.materials[i].uuid);

            // Burn() will fail if this contract does not have the necessary 
            // permissions or if the account does not have enough materials
            IGame(gameAddr).burn(_account, gameId, recipe.materials[i].count);
        }

        // Mint Reward
        for (uint256 i = 0; i < recipe.rewards.length; ++i) {
            // Get game information
            (address gameAddr, uint256 gameId) = registry.getItemInfo(recipe.rewards[i].uuid);

            // Mint() will fail if this contract does not have the necessary 
            // permissions 
            IGame(gameAddr).mint(_account, gameId, recipe.rewards[i].count);
        }

        // Notify user of item getting crafted
        emit ItemCrafted();
    }

    /******** Internal Functions ********/
    function _setActiveRecipe(uint256 _recipeId, bool _activate) internal {
        require(
            recipeList[_recipeId].isActive != _activate,
            "A recipe is already set properly."
        );

        recipeList[_recipeId].isActive = _activate;
        if (_activate) {
            activeRecipesCount++;
        } else {
            activeRecipesCount--;
        }
    }
    
    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
}