// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./GameContract.sol";

contract CraftingContract is Ownable, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;
    
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

    struct CraftingItemSet {
        EnumerableSet.UintSet idSet;
        mapping(uint256 => CraftItem) craftItemList;
    }

    /******** Stored Variables ********/
    Recipe[] private recipeList;
    uint256 private recipeIdCounter = 0;
    CraftingItemSet private gameItemMap;

    EnumerableSet.UintSet private materialsMap;
    EnumerableSet.UintSet private rewardsMap;

    /******** Roles ********/
    bytes32 public constant CRAFTING_MANAGER_ROLE = 
        keccak256("CRAFTING_MANAGER_ROLE");

    /******** Public API ********/
    function createRecipe(
        uint256[] memory materialIds,
        uint256[] memory materialAmounts,
        uint256[] memory rewardIds,
        uint256[] memory rewardAmounts,
        uint256 cost,
        bool isActive
    )
        public
        returns(uint256)
    {
        require(
            hasRole(CRAFTING_MANAGER_ROLE, msg.sender),
            "Caller does not have the necessary permissions."
        );
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
        uint256 recipeId = recipeIdCounter++;
        Recipe storage recipe = recipeList[recipeId];
        recipe.recipeId = recipeId;
        recipe.cost = cost;
        recipe.isActive = isActive;

        // Iterate through Materials List
        for (uint256 i = 0; i < materialIds.length; ++i)
        {
            uint256 id = materialIds[i];
            require(
                materialsMap.contains(id),
                "Crafting Material doesn't exist."
            );

            // Add to crafting materials list
            recipe.materials.push(ItemPair(id, materialAmounts[i]));

            // Add recipe to crafting material's recipe list
            gameItemMap.craftItemList[id].recipesAsMaterial.add(recipeId);
        }

        // Iterate through Rewards List
        for (uint256 i = 0; i < rewardIds.length; ++i)
        {
            uint256 id = rewardIds[i];
            require(
                rewardsMap.contains(id),
                "Crafting Reward doesn't exist."
            );
            
            // Add to crafting rewards list
            recipe.rewards.push(ItemPair(id, rewardAmounts[i]));
            
            // Add recipe to crafting reward's recipe list
            gameItemMap.craftItemList[id].recipesAsReward.add(recipeId);
        }

        return recipeId;
    }

    function registerCraftingMaterial(
        address gameContractAddress,
        uint256 gameContractId
    )
        public
        returns(uint256) 
    {
        require(
            hasRole(CRAFTING_MANAGER_ROLE, msg.sender),
            "Caller does not have the necessary permissions."
        );

        // Check GameContract for burner role
        GameContract gameContract = GameContract(gameContractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Crafting Contract doesn't have burning permissions."
        );
        
        // Get Hashed ID using game contract address and contract item id
        uint256 craftingItemId = _getId(gameContractAddress, gameContractId);

        // Add to crafting map
        _addCraftingItem(craftingItemId, gameContractAddress, gameContractId);

        // Add crafting id to ID Set
        materialsMap.add(craftingItemId);

        return craftingItemId;
    }

    function registerCraftingReward(
        address gameContractAddress,
        uint256 gameContractId
    )
        public
        returns(uint256) 
    {
        require(
            hasRole(CRAFTING_MANAGER_ROLE, msg.sender),
            "Caller does not have the necessary permissions."
        );

        // Check GameContract for minter role
        GameContract gameContract = GameContract(gameContractAddress);
        bytes32 minter_role = gameContract.MINTER_ROLE();
        require(
            gameContract.hasRole(minter_role, address(this)),
            "This Crafting Contract doesn't have minting permissions."
        );
        
        // Get Hashed ID using game contract address and contract item id
        uint256 craftingItemId = _getId(gameContractAddress, gameContractId);

        // Add to crafting map
        _addCraftingItem(craftingItemId, gameContractAddress, gameContractId);

        // Add crafting id to ID Set
        rewardsMap.add(craftingItemId);
        
        return craftingItemId;
    }

    function setRecipeActive(uint256 recipeId, bool activate) public {
        recipeList[recipeId].isActive = activate;
    }

    function setRecipeActiveBatch(
        uint256[] memory recipeIds,
        bool[] memory activate
    )
        public
    {
        require(
            recipeIds.length == activate.length,
            "Input array lengths do not match"
        );
        for (uint256 i = 0; i < recipeIds.length; ++i)
        {
            recipeList[recipeIds[i]].isActive = activate[i];
        }
    }

    function isRecipeActive(uint256 recipeId) public view returns(bool) {
        return recipeList[recipeId].isActive;
    }

    function updateRecipeCost(uint256 recipeId, uint256 cost) public {
        recipeList[recipeId].cost = cost;
    }

    function setupdateRecipeCostBatch(
        uint256[] memory recipeIds,
        uint256[] memory costs
    )
        public
    {
        require(
            recipeIds.length == costs.length,
            "Input array lengths do not match"
        );
        for (uint256 i = 0; i < recipeIds.length; ++i)
        {
            recipeList[recipeIds[i]].cost = costs[i];
        }
    }

    function getRecipeCost(uint256 recipeId) public view returns(uint256) {
        return recipeList[recipeId].cost;
    }

    // Gets materials list for the recipe
    // Returns: (crafting item id, amount) list
    function getCraftingMaterialsList(uint256 recipeId)
        public
        view
        returns(uint256[] memory, uint256[] memory)
    {
        require(recipeId < recipeIdCounter, "Recipe does not exist.");

        Recipe storage recipe = recipeList[recipeId];
        uint256[] memory materialsIds = new uint256[](recipe.materials.length);
        uint256[] memory counts = new uint256[](recipe.materials.length);

        for (uint i = 0; i < recipe.materials.length; ++i)
        {
            ItemPair storage itemPair = recipe.materials[i];
            materialsIds[i] = itemPair.craftingItemId;
            counts[i] = itemPair.count;
        }

        return (materialsIds, counts);
    }

    // Gets rewards list for the recipe
    // Returns: (crafting item id, amount) list
    function getRewardsList(uint256 recipeId)
        public
        view
        returns(uint256[] memory, uint256[] memory)
    {
        require(recipeId < recipeIdCounter, "Recipe does not exist.");

        Recipe storage recipe = recipeList[recipeId];
        uint256[] memory rewardItemIds = new uint256[](recipe.rewards.length);
        uint256[] memory counts = new uint256[](recipe.rewards.length);
        for (uint i = 0; i < recipe.rewards.length; ++i)
        {
            ItemPair storage itemPair = recipe.rewards[i];
            rewardItemIds[i] = itemPair.craftingItemId;
            counts[i] = itemPair.count;
        }

        return (rewardItemIds, counts);
    }

    function getItemAsCraftingMaterialList(uint256 /*itemId*/)
        public
        view
        returns(uint256[] memory)
    {
        // Todo: List of recipes where id is a material
        //       returns recipe id list
        uint256[] memory recipeIds;
        return recipeIds;
    }
    
    function getItemAsRewardList(uint256 /*itemId*/)
        public
        view
        returns(uint256[] memory)
    {
        // Todo: List of recipes where item is a reward
        //       returns recipe id list
        uint256[] memory recipeIds;
        return recipeIds;
    }
    
    function getAllRecipes()
        public
        view
        returns(uint256[] memory)
    {
        // Todo: List of all Recipes
        //       returns recipe id list
        uint256[] memory recipeIds;
        return recipeIds;
    }
    
    function getAllCraftableItems()
        public
        view
        returns(uint256[] memory)
    {
        // Todo: List of all craftable items
        //       returns rewards ids list - Game Contract item ID
        uint256[] memory rewardsItemIds;
        return rewardsItemIds;
    }

    function craftItem(uint256 id) public {
        // Todo:
    }

    function getGameContractId(uint256 craftItemId)
        public
        view
        returns(address gameContractId, uint256 gameItemId)
    {
        require(gameItemMap.idSet.contains(craftItemId));
        return (
            gameItemMap.craftItemList[craftItemId].gameContractAddress,
            gameItemMap.craftItemList[craftItemId].gameContractItemId
        );
    }
    
    /******** Internal Functions ********/
    function _getId(
        address gameContractAddress,
        uint256 gameContractId
    )
        internal
        pure
        returns(uint256)
    {
        return uint(keccak256(abi.encodePacked(
            gameContractAddress,
            gameContractId
        )));
    }

    function _addCraftingItem(
        uint256 craftingItemId,
        address gameContractAddress,
        uint256 gameContractId
    )
        internal
    {
        // If it already exists, ignore
        if (gameItemMap.idSet.add(craftingItemId))
        {
            // Add crafting item data to Crafting Materials List
            CraftItem storage item = gameItemMap.craftItemList[craftingItemId];
            item.gameContractAddress = gameContractAddress;
            item.gameContractItemId = gameContractId;
        }
    }
}