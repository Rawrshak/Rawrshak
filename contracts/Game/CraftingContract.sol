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

    /******** Stored Variables ********/
    // Todo: temporarily making recipeList, recipeIdCounter and gameItemMap public
    Recipe[] private recipeList;
    uint256 public activeRecipesCount = 0;
    uint256 private recipeIdCounter = 0;
    EnumerableSet.UintSet private craftItemIds;
    mapping(uint256 => CraftItem) private craftItems;

    /******** Events ********/
    event AddedCraftingItem(uint256);

    /******** Roles ********/
    bytes32 public constant CRAFTING_MANAGER_ROLE = 
        keccak256("CRAFTING_MANAGER_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    /******** Public API ********/
    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(CRAFTING_MANAGER_ROLE, msg.sender);
    }

    function createRecipe(
        uint256[] memory materialIds,
        uint256[] memory materialAmounts,
        uint256[] memory rewardIds,
        uint256[] memory rewardAmounts,
        uint256 cost,
        bool isActive
    )
        public
        checkPermissions(CRAFTING_MANAGER_ROLE)
        returns(uint256)
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
        uint256 recipeId = recipeIdCounter++;
        Recipe storage recipe = recipeList[recipeId];
        recipe.recipeId = recipeId;
        recipe.cost = cost;
        recipe.isActive = isActive;
        if (isActive) {
            activeRecipesCount++;
        }

        // Iterate through Materials List
        for (uint256 i = 0; i < materialIds.length; ++i)
        {
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
        for (uint256 i = 0; i < rewardIds.length; ++i)
        {
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

        return recipeId;
    }

    function registerCraftingMaterial(
        address gameContractAddress,
        uint256 gameContractId
    )
        public
        checkPermissions(CRAFTING_MANAGER_ROLE)
    {
        // Todo: check that GameContractAddress is a GameContract
        // Check GameContract for burner role
        GameContract gameContract = GameContract(gameContractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Crafting Contract doesn't have burning permissions."
        );
        
        require(
            gameContract.exists(gameContractId),
            "This item does not exist."
        );
        
        // Get Hashed ID using game contract address and contract item id
        uint256 hashId = _getId(gameContractAddress, gameContractId);

        // Add to crafting map
        require(
            _addCraftingItem(
                hashId,
                gameContractAddress,
                gameContractId),
            "This crafting item is already stored."
        );
    }

    function registerCraftingReward(
        address gameContractAddress,
        uint256 gameContractId
    )
        public
        checkPermissions(CRAFTING_MANAGER_ROLE)
    {
        // Check GameContract for minter role
        GameContract gameContract = GameContract(gameContractAddress);
        bytes32 minter_role = gameContract.MINTER_ROLE();
        require(
            gameContract.hasRole(minter_role, address(this)),
            "This Crafting Contract doesn't have minting permissions."
        );
        
        require(
            gameContract.exists(gameContractId),
            "This item does not exist."
        );
        
        // Get Hashed ID using game contract address and contract item id
        uint256 hashId = _getId(gameContractAddress, gameContractId);

        // Add to crafting map
        require(
            _addCraftingItem(
                hashId,
                gameContractAddress,
                gameContractId),
            "This crafting item is already stored."
        );
    }

    function setRecipeActive(uint256 recipeId, bool activate) public {
        recipeList[recipeId].isActive = activate;
        if (activate) {
            activeRecipesCount++;
        } else {
            activeRecipesCount--;
        }
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
            setRecipeActive(recipeIds[i], activate[i]);
        }
    }

    function isRecipeActive(uint256 recipeId) public view returns(bool) {
        return recipeList[recipeId].isActive;
    }

    function updateRecipeCost(uint256 recipeId, uint256 cost) public {
        recipeList[recipeId].cost = cost;
    }

    function updateRecipeCostBatch(
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

    // List of recipes where id is a material
    // returns recipe id list
    function getItemAsCraftingMaterialList(
        address gameContract,
        uint256 itemId
    )
        public
        view
        returns(uint256[] memory)
    {
        uint256 id = _getId(gameContract, itemId);
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsMaterial.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i)
        {
            recipeIds[i] = item.recipesAsMaterial.at(i);
        }
        return recipeIds;
    }

    // Crafting ID
    function getItemAsCraftingMaterialList(uint256 id)
        public
        view
        returns(uint256[] memory)
    {
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsMaterial.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i)
        {
            recipeIds[i] = item.recipesAsMaterial.at(i);
        }

        return recipeIds;
    }
    
    // List of recipes where item is a reward
    // returns recipe id list
    function getItemAsRewardList(
        address gameContract,
        uint256 itemId
    )
        public
        view
        returns(uint256[] memory)
    {
        uint256 id = _getId(gameContract, itemId);
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsReward.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i)
        {
            recipeIds[i] = item.recipesAsReward.at(i);
        }

        return recipeIds;
    }

    // Crafting ID
    function getItemAsRewardList(uint256 id)
        public
        view
        returns(uint256[] memory)
    {
        require(
            craftItemIds.contains(id),
            "Item is not a registered crafting item."
        );

        CraftItem storage item = craftItems[id];
        uint256 len = item.recipesAsReward.length();
        uint256[] memory recipeIds = new uint256[](len);
        for (uint i = 0; i < len; ++i)
        {
            recipeIds[i] = item.recipesAsReward.at(i);
        }

        return recipeIds;
    }

    // List of all active Recipes
    // returns recipe id list
    function getActiveRecipes()
        public
        view
        returns(uint256[] memory)
    {
        if (activeRecipesCount == 0)
        {
            uint256[] memory empty;
            return empty;
        }

        uint256[] memory recipeIds = new uint256[](activeRecipesCount);
        uint256 activeRecipeIterator = 0;

        for (uint i = 0; i < recipeIdCounter; ++i)
        {
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

    function getActiveRecipesCount() public view returns(uint256)
    {
        return activeRecipesCount;
    }

    function craftItem(uint256 recipeId) public {
        // Todo: Decent chunk of work.
    }

    function getGameContractId(uint256 craftItemId)
        public
        view
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

    function getCraftItemId(
        address gameContractAddress,
        uint256 gameContractId
    )
        public
        pure
        returns(uint256)
    {
        return _getId(gameContractAddress, gameContractId);
    }
    
    function getCraftItemsLength() public view returns(uint256) {
        return craftItemIds.length();
    }

    /******** TEST Functions ********/
    // Todo: Delete these
    function getItemHash(uint256 index) public view returns(uint256) {
        return craftItemIds.at(index);
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
        return uint256(keccak256(abi.encodePacked(
            gameContractAddress,
            gameContractId
        )));
    }

    function _addCraftingItem(
        uint256 hashId,
        address gameContractAddress,
        uint256 gameContractId
    )
        internal
        returns(bool)
    {
        // If it already exists, ignore
        if (craftItemIds.add(hashId))
        {
            // Add crafting item data to Crafting Materials List
            CraftItem storage item = craftItems[hashId];
            item.gameContractAddress = gameContractAddress;
            item.gameContractItemId = gameContractId;
            emit AddedCraftingItem(hashId);
            return true;
        }
        return false;
    }
}