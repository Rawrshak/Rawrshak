// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibCraft.sol";

interface ISalvage {
    /******** View Functions ********/
    function getSalvageOutputs(LibCraft.AssetData calldata _asset) external view returns(LibCraft.SalvageOutput[] memory outputAssets, LibLootbox.LootboxCreditReward memory outputLootboxCredits);

    /******** Mutative Functions ********/
    function addSalvageableAssetBatch(LibCraft.SalvageableAsset[] memory _asset) external;

    function salvage(LibCraft.AssetData memory _asset, uint256 _amount) external;

    function salvageBatch(LibCraft.AssetData[] memory _assets, uint256[] memory _amounts) external;

    /*********************** Events *********************/
    event SalvageableAssetsUpdated(address indexed operator, LibCraft.SalvageableAsset[] assets, uint256[] ids);
    event AssetSalvaged(address indexed user, LibCraft.AssetData asset, uint256 amount);
    event AssetSalvagedBatch(address indexed user, LibCraft.AssetData[] assets, uint256[] amounts);
    event LootboxCreditEarned(address indexed user, address tokenAddress, uint256 amount);
}