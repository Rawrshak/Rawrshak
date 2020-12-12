// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./ICraftingInterface.sol";

interface ICrafting is ICraftingInterface {
    struct RecipeParam {
        uint256[] materialUuids;
        uint256[] materialAmounts;
        uint256[] rewardUuids;
        uint256[] rewardAmounts;
        address tokenAddr;
        uint256 cost;
        bool isActive;
    }

    /******** View Functions ********/
    function exists(uint256 _recipeId) external view returns(bool);
    
    function generateNextRecipeId() external view returns(uint256);

    /******** Mutative Functions ********/
    function createRecipe(uint256 _recipeId) external;
    
    function craftItem(uint256 _recipeId, address payable _account) external;
}