// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibSalvage.sol";

interface ISalvageStorage { 
    /******** Mutative Functions ********/
    function registerManager(address _manager) external;

    function registerContent(address _content) external;

    function addSalvageableAssetBatch(LibSalvage.SalvageableAsset[] memory _asset) external;

    function getId(LibSalvage.AssetData calldata _asset) external pure returns(uint256);
}