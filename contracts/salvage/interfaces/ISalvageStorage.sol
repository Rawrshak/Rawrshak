// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibSalvage.sol";

interface ISalvageStorage { 
    /******** Mutative Functions ********/
    function registerManager(address _manager) external;

    function registerContent(address _content) external;

    function managerSetPause(bool _setPause) external;

    function setSalvageableAssetBatch(LibSalvage.SalvageableAsset[] memory _asset) external;

    function salvage(LibSalvage.AssetData memory _asset, uint256 _amount) external;

    function salvageBatch(LibSalvage.AssetData[] memory _assets, uint256[] memory _amounts) external;

    function getId(LibSalvage.AssetData calldata _asset) external pure returns(uint256);
}