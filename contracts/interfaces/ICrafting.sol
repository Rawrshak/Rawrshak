// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "./ICraftingInterface.sol";

interface ICrafting is ICraftingInterface {

    /******** View Functions ********/
    function getCraftingManagerAddress() external view returns(address);

    function exists(uint256 _recipeId) external view returns(bool);
    
    function generateNextRecipeId() external view returns(uint256);

    function isRecipeActive(uint256 _recipeId) external view returns(bool);

    function getRecipeCost(uint256 _recipeId) external view returns(address, uint256);
    
    function getCraftingMaterialsList(uint256 _recipeId)
        external
        view
        returns(uint256[] memory uuids, uint256[] memory counts);

    function getRewardsList(uint256 _recipeId)
        external
        view
        returns(uint256[] memory uuids, uint256[] memory counts);

    function getActiveRecipeCount() external view returns(uint256);

    /******** Mutative Functions ********/
    function createRecipe(uint256 _recipeId) external;
    
    function craftItem(uint256 _recipeId, address payable _account) external;
    
    function setCraftingManagerAddress(address _newAddress) external;
}