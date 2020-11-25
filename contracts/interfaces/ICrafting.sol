// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ICrafting {
    // view 
    function isRecipeActive(uint256 recipeId) external view returns(bool);

    function getTokenAddressForCrafting() external view returns(address);

    function getRecipeCost(uint256 recipeId) external view returns(uint256);

    function getCraftingMaterialsList(uint256 recipeId)
        external
        view
        returns(uint256[] memory, uint256[] memory);

    function getRewardsList(uint256 recipeId)
        external
        view
        returns(uint256[] memory rewardItemIds, uint256[] memory counts);

    function getItemAsCraftingMaterialList(address game, uint256 itemId)
        external
        view
        returns(uint256[] memory recipeIds);

    function getItemAsCraftingMaterialList(uint256 id) external view returns(uint256[] memory);
    
    function getItemAsRewardList(address game, uint256 itemId) external view returns(uint256[] memory);

    function getItemAsRewardList(uint256 id) external view returns(uint256[] memory);

    function getActiveRecipes() external view returns(uint256[] memory);

    function getActiveRecipesCount() external view returns(uint256);

    function getGameContractId(uint256 craftItemId)
        external
        view
        returns(address gameContractId, uint256 gameItemId);

    function getCraftItemId(address gameContractAddress, uint256 gameContractId)
        external
        view
        returns(uint256);

    function getCraftItemsLength() external view returns(uint256);

    // mutative 
    function createRecipe(
        uint256[] calldata materialIds,
        uint256[] calldata materialAmounts,
        uint256[] calldata rewardIds,
        uint256[] calldata rewardAmounts,
        uint256 cost,
        bool isActive
    ) external;

    function registerCraftingMaterial(address gameContractAddress, uint256 gameContractId) external;

    function registerCraftingReward(address gameContractAddress, uint256 gameContractId) external;

    function setRecipeActive(uint256 recipeId, bool activate) external;

    function setRecipeActiveBatch(uint256[] calldata recipeIds, bool[] calldata activate) external;

    function updateRecipeCost(uint256 recipeId, uint256 cost) external;

    function updateRecipeCostBatch(uint256[] calldata recipeIds, uint256[] calldata costs) external;

    function craftItem(uint256 recipeId, address payable account) external;
}