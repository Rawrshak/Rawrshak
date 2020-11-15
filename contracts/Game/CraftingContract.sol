// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract CraftingContract is Ownable, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;
    
    /******** Data Structures ********/
    struct ItemPair {
        uint256 craftingItemId;
        uint256 count;
    }
    struct Recipe {
        uint256 recipeId;
        ItemPair[] materialsId;
        ItemPair[] rewardsId;
        uint256 cost;
        bool isActive;
    }

    struct CraftItem {
        address gameContractAddress;
        uint256 gameContractItemId;
        // instanceCount[recipeId]
        mapping(uint256 => uint256) instanceCount;
        EnumerableSet.UintSet recipes;
    }

    struct RecipeSet {
        EnumerableSet.UintSet idSet;
        // recipeID => recipe
        mapping(uint256 => Recipe) recipeList;
    }

    struct CraftingItemSet {
        EnumerableSet.UintSet idSet;
        // craftItemList[hash(gameContractAddress) + hash(gameContractId)]
        // Todo: ID: keccak256(abi.encodePacket(gameContractAddress, gameContractId))
        mapping(uint256 => CraftItem) craftItemList;
    }

    /******** Stored Variables ********/
    RecipeSet private recipeMap;
    CraftingItemSet private craftingMaterialsMap;
    CraftingItemSet private craftingRewardsMap;

    /******** Roles ********/
    bytes32 public constant CRAFTING_MANAGER_ROLE = 
        keccak256("CRAFTING_MANAGER_ROLE");

    /******** Public API ********/
    function createRecipe() public {
        // Todo:
        // Todo: Check whether this contract has the minter and burner roles
        //       on the contract before adding it.
        // Todo: Someone has to add the minter/burner roles to this crafting
        //       contract;
        
    }
    
    function createRecipeBatch() public {
        // Todo:
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
    
}