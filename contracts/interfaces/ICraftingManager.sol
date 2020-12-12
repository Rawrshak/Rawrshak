// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./ICraftingInterface.sol";

interface ICraftingManager is ICraftingInterface {
    /******** View Functions ********/
    function getCraftingAddress() external view returns(address);
    
    /******** Mutative Functions ********/
    function setCraftingAddress(address _addr) external;

    function createRecipe(
        uint256[] calldata _materialIds,
        uint256[] calldata _materialAmounts,
        uint256[] calldata _rewardIds,
        uint256[] calldata _rewardAmounts,
        address _tokenAddr,
        uint256 _cost,
        bool _isActive
    ) external;

    function updateRecipeActiveBatch(uint256[] calldata _recipeIds, bool[] calldata _activates) external;

    function updateRecipeCostBatch(uint256[] calldata _recipeIds, address[] calldata _tokenAddrs, uint256[] calldata _costs) external;
}