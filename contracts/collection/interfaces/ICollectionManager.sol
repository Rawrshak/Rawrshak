// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";
import "./ICollection.sol";
import "./ICollectionStorage.sol";
import "./IAccessControlManager.sol";

interface ICollectionManager {

    /******** View Functions ********/
    function collection() external view returns(ICollection);

    function isMinter(address _minter) external view returns(bool);

    /******** Mutative Functions ********/

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function registerOperators(LibAsset.SystemApprovalPair[] memory _operators) external;

    function registerSystemContracts(LibAsset.SystemApprovalPair[] memory _contracts) external;

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalty(address _receiver, uint24 _rate) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
}