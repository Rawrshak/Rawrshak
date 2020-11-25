// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ICrafting {
    // view 
    function isRecipeActive(uint256 _recipeId) external view returns(bool);

    function getTokenAddressForCrafting() external view returns(address);

    function getRecipeCost(uint256 _recipeId) external view returns(uint256);

    function getCraftingMaterialsList(uint256 _recipeId)
        external
        view
        returns(uint256[] memory uuids, uint256[] memory counts);

    function getRewardsList(uint256 _recipeId)
        external
        view
        returns(uint256[] memory uuids, uint256[] memory counts);

    function getItemAsCraftingMaterialList(uint256 _uuid) external view returns(uint256[] memory recipeIds);
    
    function getItemAsRewardList(uint256 _uuid) external view returns(uint256[] memory recipeIds);

    function getActiveRecipes() external view returns(uint256[] memory recipeIds);

    function getActiveRecipesCount() external view returns(uint256);

    // mutative 
    function createRecipe(
        uint256[] calldata _materialIds,
        uint256[] calldata _materialAmounts,
        uint256[] calldata _rewardIds,
        uint256[] calldata _rewardAmounts,
        uint256 _cost,
        bool _isActive
    ) external;

    // function registerCraftingMaterial(address gameContractAddress, uint256 gameContractId) external;

    // function registerCraftingReward(address gameContractAddress, uint256 gameContractId) external;

    function setRecipeActive(uint256 _recipeId, bool _activate) external;

    function setRecipeActiveBatch(uint256[] calldata _recipeIds, bool[] calldata _activate) external;

    function updateRecipeCost(uint256 _recipeId, uint256 _cost) external;

    function updateRecipeCostBatch(uint256[] calldata _recipeIds, uint256[] calldata _costs) external;

    function craftItem(uint256 _recipeId, address payable _account) external;
}