// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibCraft.sol";

interface ICraft { 
    /******** Mutative Functions ********/
    function setRecipeBatch(LibCraft.Recipe[] memory _asset) external;

    function setRecipeEnabled(uint256 _id, bool _enabled) external;

    function setRecipeCraftingRate(uint256 _id, uint256 _craftingRate) external;

    function craft(uint256 _id, uint256 _amount) external;

    function getRecipe(uint256 _id) external view returns(LibCraft.Recipe memory _recipe);

    function exists(uint256 _id) external view returns(bool);
}