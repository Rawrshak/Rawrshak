// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/IGame.sol";
import "../interfaces/ICrafting.sol";
import "../tokens/TokenBase.sol";
import "../utils/Utils.sol";

// Todo: Single Game Crafting Contract: more efficient for single game contracts
// Todo: Multi-Game Crafting Contract
// Todo: Recipe Storage 

contract Crafting is ICrafting, Ownable, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using Utils for *;
    
    /******** Data Structures ********/
    struct ItemPair {
        uint256 craftingItemId;
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
        address gameContractAddress;
        uint256 gameContractItemId;
        EnumerableSet.UintSet recipesAsMaterial;
        EnumerableSet.UintSet recipesAsReward;
    }

    /******** Stored Variables ********/
    Recipe[] private recipeList;
    uint256 public activeRecipesCount = 0;
    EnumerableSet.UintSet private craftItemIds;
    mapping(uint256 => CraftItem) private craftItems;
    address tokenContractAddress;

    /******** Events ********/
    // Todo: AddedCraftingItemBatch()
    event AddedCraftingItem(uint256);
    event RecipeCreated(uint256);
    event ItemCrafted();

    /******** Roles ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant SMITH_ROLE = keccak256("SMITH_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    modifier checkAddressIsContract(address contractAddress) {
        require(Address.isContract(contractAddress), "Coin address is not valid");
        _;
    }

    /******** Public API ********/
    constructor(address coinAddress)
        public
        checkAddressIsContract(coinAddress)
    {
        tokenContractAddress = coinAddress;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
    }

    function createRecipe(
        uint256[] calldata materialIds,
        uint256[] calldata materialAmounts,
        uint256[] calldata rewardIds,
        uint256[] calldata rewardAmounts,
        uint256 cost,
        bool isActive
    )
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(
            materialIds.length == materialAmounts.length,
            "Materials lists do not match."
        );
        require(
            rewardIds.length == rewardAmounts.length,
            "Rewards lists do not match."
        );

        // The recipes do not get deleted so the recipe id counter is only ever 
        // incremented;
        uint256 recipeId = recipeList.length;
        Recipe storage recipe = recipeList.push();
        recipe.recipeId = recipeId;
        recipe.cost = cost;
        recipe.isActive = isActive;
        if (isActive) {
            activeRecipesCount++;
        }

        // Iterate through Materials List
        for (uint256 i = 0; i < materialIds.length; ++i) {
            uint256 id = materialIds[i];
            require(
                craftItemIds.contains(id),
                "Crafting Material doesn't exist."
            );

            // Add to crafting materials list
            recipe.materials.push(ItemPair(id, materialAmounts[i]));

            // Add recipe to crafting material's recipe list
            craftItems[id].recipesAsMaterial.add(recipeId);
        }

        // Iterate through Rewards List
        for (uint256 i = 0; i < rewardIds.length; ++i) {
            uint256 id = rewardIds[i];
            require(
                craftItemIds.contains(id),
                "Crafting Reward doesn't exist."
            );
            
            // Add to crafting rewards list
            recipe.rewards.push(ItemPair(id, rewardAmounts[i]));
            
            // Add recipe to crafting reward's recipe list
            craftItems[id].recipesAsReward.add(recipeId);
        }

        emit RecipeCreated(recipeId);
    }

    // Todo: registerCraftingMaterialBatch()
    function registerCraftingMaterial(address gameContractAddress, uint256 gameContractId)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(gameContractAddress)
    {
        require(
            IGame(gameContractAddress).contains(gameContractId),
            "This item does not exist."
        );
        
        // Add to crafting map
        (uint256 hashId, bool success) = _addCraftingItem(gameContractAddress, gameContractId);
        require(success, "This crafting item is already stored.");

        emit AddedCraftingItem(hashId);
    }

    // Todo: registerCraftingRewardBatch()
    function registerCraftingReward(address gameContractAddress, uint256 gameContractId)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(gameContractAddress)
    {
        require(
            IGame(gameContractAddress).contains(gameContractId),
            "This item does not exist."
        );

        // Add to crafting map
        (uint256 hashId, bool success) = _addCraftingItem(gameContractAddress, gameContractId);
        require(success, "This crafting item is already stored.");

        emit AddedCraftingItem(hashId);
    }

    function setRecipeActive(uint256 recipeId, bool activate) 
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        _setActiveRecipe(recipeId, activate);
    }

    function setRecipeActiveBatch(uint256[] calldata recipeIds, bool[] calldata activate)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(
            recipeIds.length == activate.length,
            "Input array lengths do not match"
        );

        for (uint256 i = 0; i < recipeIds.length; ++i) {
            _setActiveRecipe(recipeIds[i], activate[i]);
        }
    }

    function isRecipeActive(uint256 recipeId) external view override returns(bool) {
        return recipeList[recipeId].isActive;
    }

    function updateRecipeCost(uint256 recipeId, uint256 cost)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        recipeList[recipeId].cost = cost;
    }

    function updateRecipeCostBatch(uint256[] calldata recipeIds, uint256[] calldata costs)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(
            recipeIds.length == costs.length,
            "Input array lengths do not match"
        );

        for (uint256 i = 0; i < recipeIds.length; ++i) {
            recipeList[recipeIds[i]].cost = costs[i];
        }
    }

    function getTokenAddressForCrafting() external view override returns(address)
    {
        return tokenContractAddress;
    }

    function getRecipeCost(uint256 recipeId) external view override returns(uint256) {
        return recipeList[recipeId].cost;
    }

    // Gets materials list for the recipe
    // Returns: (crafting item id, amount) list
    function getCraftingMaterialsList(uint256 recipeId)
        external
        view
        override
        returns(uint256[] memory, uint256[] memory)
    {
        require(recipeId < recipeList.length, "Recipe does not exist.");

        Recipe storage recipe = recipeList[recipeId];
        uint256[] memory materialsIds = new uint256[](recipe.materials.length);
        uint256[] memory counts = new uint256[](recipe.materials.length);

        for (uint i = 0; i < recipe.materials.length; ++i) {
            ItemPair storage itemPair = recipe.materials[i];
            materialsIds[i] = itemPair.craftingItemId;
            counts[i] = itemPair.count;
        }

        return (materialsIds, counts);
    }

    // Gets rewards list for the recipe
    // Returns: (crafting item id, amount) list
    function getRewardsList(uint256 recipeId)
        external
        view
        override
        returns(uint256[] memory rewardItemIds, uint256[] memory counts)
    {
        require(recipeId < recipeList.length, "Recipe does not exist.");

        Recipe storage recipe = recipeList[recipeId];
        rewardItemIds = new uint256[](recipe.rewards.length);
        counts = new uint256[](recipe.rewards.length);
        for (uint i = 0; i < recipe.rewards.length; ++i) {
            ItemPair storage itemPair = recipe.rewards[i];
            rewardItemIds[i] = itemPair.craftingItemId;
            counts[i] = itemPair.count;
        }
    }

    // List of recipes where id is a material
    // returns recipe id list
    function getItemAsCraftingMaterialList(address game, uint256 itemId)
        external
        view
        override
        returns(uint256[] memory recipeIds)
    {
        uint256 id = Utils.getId(game, itemId);
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsMaterial.length();
        recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i) {
            recipeIds[i] = item.recipesAsMaterial.at(i);
        }
        return recipeIds;
    }

    // Crafting ID
    function getItemAsCraftingMaterialList(uint256 id)
        external
        view
        override
        returns(uint256[] memory)
    {
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsMaterial.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i) {
            recipeIds[i] = item.recipesAsMaterial.at(i);
        }

        return recipeIds;
    }
    
    // List of recipes where item is a reward
    // returns recipe id list
    function getItemAsRewardList(address game, uint256 itemId)
        external
        view
        override
        returns(uint256[] memory)
    {
        uint256 id = Utils.getId(game, itemId);
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsReward.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i) {
            recipeIds[i] = item.recipesAsReward.at(i);
        }

        return recipeIds;
    }

    // Crafting ID
    function getItemAsRewardList(uint256 id) external view override returns(uint256[] memory)
    {
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsReward.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i) {
            recipeIds[i] = item.recipesAsReward.at(i);
        }

        return recipeIds;
    }

    // List of all active Recipes
    // returns recipe id list
    function getActiveRecipes() external view override returns(uint256[] memory)
    {
        if (activeRecipesCount == 0) {
            uint256[] memory empty;
            return empty;
        }

        uint256[] memory recipeIds = new uint256[](activeRecipesCount);
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
        return recipeIds;
    }

    function getActiveRecipesCount() external view override returns(uint256)
    {
        return activeRecipesCount;
    }

    function craftItem(uint256 recipeId, address payable account)
        external
        override
        checkPermissions(SMITH_ROLE)
    {
        require(recipeId < recipeList.length, "Recipe does not exist.");
        require(recipeList[recipeId].isActive, "Recipe is not active.");
        
        Recipe storage recipe = recipeList[recipeId];

        if (recipe.cost > 0) {
            // This will fail if the account doesn't have enough to cover the 
            // cost of crafting this item
            TokenBase token = TokenBase(tokenContractAddress);
            token.transferFrom(account, owner(), recipe.cost);
        }

        // Burns the materials in the game contract
        for (uint256 i = 0; i < recipe.materials.length; ++i) {
            // Get Crafting Item
            CraftItem storage item = craftItems[recipe.materials[i].craftingItemId];

            // Burn() will fail if this contract does not have the necessary 
            // permissions or if the account does not have enough materials
            IGame(item.gameContractAddress).burn(account, item.gameContractItemId, recipe.materials[i].count);
        }

        // Mint Reward
        for (uint256 i = 0; i < recipe.rewards.length; ++i) {
            // Get Crafting Item
            CraftItem storage item = craftItems[recipe.rewards[i].craftingItemId];

            // Mint() will fail if this contract does not have the necessary 
            // permissions 
            IGame(item.gameContractAddress).mint(account, item.gameContractItemId, recipe.rewards[i].count);
        }

        // Notify user of item getting crafted
        emit ItemCrafted();
    }

    function getGameContractId(uint256 craftItemId)
        external
        view
        override
        returns(address gameContractId, uint256 gameItemId)
    {
        require(
            craftItemIds.contains(craftItemId),
            "Item is not a registered crafting item"
        );
        gameContractId =
            craftItems[craftItemId].gameContractAddress;
        gameItemId = craftItems[craftItemId].gameContractItemId;
    }

    function getCraftItemId(address gameContractAddress, uint256 gameContractId)
        external
        view
        override
        checkAddressIsContract(gameContractAddress)
        returns(uint256)
    {
        return Utils.getId(gameContractAddress, gameContractId);
    }
    
    function getCraftItemsLength() external view override returns(uint256) {
        return craftItemIds.length();
    }

    /******** TEST Functions ********/
    // // Todo: Delete these
    // function getItemHash(uint256 index) public view returns(uint256) {
    //     return craftItemIds.at(index);
    // }
    
    /******** Internal Functions ********/
    function _addCraftingItem(address contractAddress, uint256 id) internal returns(uint256 hashId, bool success) {
        // Get Hashed ID using game contract address and contract item id
        hashId = Utils.getId(contractAddress, id);
        
        // If it already exists, ignore
        if (craftItemIds.add(hashId)) {
            // Add crafting item data to Crafting Materials List
            CraftItem storage item = craftItems[hashId];
            item.gameContractAddress = contractAddress;
            item.gameContractItemId = id;
            emit AddedCraftingItem(hashId);
            success = true;
        }
    }

    function _setActiveRecipe(uint256 recipeId, bool activate) internal {
        require(
            recipeList[recipeId].isActive != activate,
            "A recipe is already set properly."
        );

        recipeList[recipeId].isActive = activate;
        if (activate) {
            activeRecipesCount++;
        } else {
            activeRecipesCount--;
        }
    }
}