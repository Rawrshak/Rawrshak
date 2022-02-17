// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibCraft.sol";

interface ICraft {
    /******** View Functions ********/
    function recipe(uint256 _id) external view returns(LibCraft.Recipe memory _recipe);

    /******** Mutative Functions ********/
    function addRecipeBatch(LibCraft.Recipe[] memory _asset) external;

    function setRecipeEnabled(uint256 _id, bool _enabled) external;

    function craft(uint256 _id, uint256 _amount) external;
    
    /*********************** Events *********************/
    event RecipeAdded(address indexed operator, uint256[] ids, LibCraft.Recipe[] recipes);
    event RecipeEnabled(address indexed operator, uint256 indexed id, bool enabled);
    event RecipeCraftingRateUpdated(address indexed operator, uint256 indexed id, uint256 craftingRate);
    event AssetsCrafted(address indexed user, uint256 indexed id, uint256 amountSucceeded);
}