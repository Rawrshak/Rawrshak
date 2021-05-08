// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibCraft.sol";

interface ICraft {
    /******** View Functions ********/
    function recipe(uint256 _id) external view returns(LibCraft.Recipe memory _recipe);

    function exists(uint256 _id) external view returns(bool);

    /******** Mutative Functions ********/
    function setRecipeBatch(LibCraft.Recipe[] memory _asset) external;

    function setRecipeEnabled(uint256 _id, bool _enabled) external;

    function setRecipeCraftingRate(uint256 _id, uint256 _craftingRate) external;

    function craft(uint256 _id, uint256 _amount) external;
    
    /*********************** Events *********************/
    event RecipeUpdated(LibCraft.Recipe[] _recipes);
    event RecipeEnabled(uint256 _id, bool _enabled);
    event RecipeCraftingRateUpdated(uint256 _id, uint256 _craftingRate);
    event AssetsCrafted(uint256 _id, uint256 _amountSucceeded);
}