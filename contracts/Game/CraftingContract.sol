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
        EnumerableSet.UintSet recipes;
    }

    // struct RecipeSet {
    //     EnumerableSet.UintSet idSet;
    //     // recipeID => recipe
    //     mapping(uint256 => Recipe) recipeList;
    // }

    struct CraftingItemSet {
        EnumerableSet.UintSet idSet;
        mapping(uint256 => CraftItem) craftItemList;
    }

    /******** Stored Variables ********/
    Recipe[] private recipeList;
    uint256 recipeIdCounter = 0;
    CraftingItemSet private materialsMap;
    CraftingItemSet private rewardsMap;

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
            require(
                materialsMap.idSet.contains(materialIds[i]),
                "Crafting Material doesn't exist."
            );

            // Add to crafting materials list
            recipe.materials.push(ItemPair(materialIds[i], materialAmounts[i]));

            // Add recipe to crafting material's recipe list
            materialsMap.craftItemList[materialIds[i]].recipes.add(recipeId);
        }

        // Iterate through Rewards List
        for (uint256 i = 0; i < rewardIds.length; ++i)
        {
            require(
                rewardsMap.idSet.contains(rewardIds[i]),
                "Crafting Reward doesn't exist."
            );
            
            // Add to crafting rewards list
            recipe.rewards.push(ItemPair(rewardIds[i], rewardAmounts[i]));
            
            // Add recipe to crafting reward's recipe list
            rewardsMap.craftItemList[rewardIds[i]].recipes.add(recipeId);
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
        uint256 materialId = _getId(gameContractAddress, gameContractId);
        require(
            !materialsMap.idSet.contains(materialId),
            "Crafting Material is already registered."
        );

        // Add crafting id to ID Set
        materialsMap.idSet.add(materialId);
        
        // Add crafting item data to Crafting Materials List
        CraftItem storage craftItem = materialsMap.craftItemList[materialId];
        craftItem.gameContractAddress = gameContractAddress;
        craftItem.gameContractItemId = gameContractId;
        
        return materialId;
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
        uint256 rewardId = _getId(gameContractAddress, gameContractId);
        require(
            !rewardsMap.idSet.contains(rewardId),
            "Crafting reward is already registered."
        );

        // Add crafting id to ID Set
        rewardsMap.idSet.add(rewardId);
        
        // Add crafting item data to Crafting Rewards List
        CraftItem storage craftItem = rewardsMap.craftItemList[rewardId];
        craftItem.gameContractAddress = gameContractAddress;
        craftItem.gameContractItemId = gameContractId;
        
        return rewardId;
    }

    function setRecipeActive(uint256 id, bool activate) public {
        // Todo:
    }

    function setRecipeActiveBatch(uint256[] memory ids, bool[] memory activate) public {
        // Todo:
    }

    function isRecipeActive(uint256 id) public view returns(bool) {
        // Todo:
    }

    function updateRecipeCost(uint256 id, uint256 cost) public {
        // Todo:
    }

    function getRecipeCost(uint256 id) public view returns(uint256) {
        // Todo:
    }

    function craftItem(uint256 id) public {
        // Todo:
    }

    function getCraftingMaterialsList(uint256 /*recipeId*/)
        public
        view
        returns(uint256[] memory, uint256[] memory)
    {
        // Todo: Gets materials list for the recipe
        //       returns (recipeIds, amount) list
        uint256[] memory craftingItemIds;
        uint256[] memory counts;
        return (craftingItemIds, counts);
    }

    function getRewardsList(uint256 /*recipeId*/)
        public
        view
        returns(uint256[] memory, uint256[] memory)
    {
        // Todo: Gets rewards list for the recipe 
        //       returns (recipeIds, amount) list
        uint256[] memory rewardItemIds;
        uint256[] memory counts;
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
}