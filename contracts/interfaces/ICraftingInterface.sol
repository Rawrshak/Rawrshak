// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ICraftingInterface {

    /******** Mutative Functions ********/ 
    function setGlobalItemRegistryAddr(address _addr) external;

    function setDeveloperWallet(address payable wallet) external;

    function updateMaterialsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _materialUuids,
        uint256[] calldata _materialAmounts
    ) external;

    function updateRewardsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _rewardUuids,
        uint256[] calldata _rewardAmounts
    ) external;

    function updateRecipeActive(uint256 _recipeId, bool _activate) external;

    function updateRecipeCost(uint256 _recipeId, address _tokenAddr, uint256 _cost) external;
}