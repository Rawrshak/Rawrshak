// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibCraft.sol";

interface ISalvage {
    /******** View Functions ********/
    function getId(LibCraft.AssetData calldata _asset) external pure returns(uint256);

    function getSalvageRewards(uint256 _id) external view returns(LibCraft.SalvageReward[] memory rewards);

    /******** Mutative Functions ********/
    function setSalvageableAssetBatch(LibCraft.SalvageableAsset[] memory _asset) external;

    function salvage(LibCraft.AssetData memory _asset, uint256 _amount) external;

    function salvageBatch(LibCraft.AssetData[] memory _assets, uint256[] memory _amounts) external;

    /*********************** Events *********************/
    event SalvageableAssetsUpdated(LibCraft.SalvageableAsset[] assets, uint256[] ids);
    event AssetSalvaged(LibCraft.AssetData asset, uint256 amount);
    event AssetSalvagedBatch(LibCraft.AssetData[] assets, uint256[] amounts);
}