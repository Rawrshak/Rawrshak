// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IContent.sol";
import "./IContentStorage.sol";
import "./IAccessControlManager.sol";

interface IContentManager {

    /*********************** Events *********************/
    // event ContentManagerCreated(address indexed owner, address content, address contentStorage, address accessControlManager);
    
    /******** View Functions ********/
    function content() external view returns(IContent);
    
    function contentStorage() external view returns(IContentStorage);
    
    function accessControlManager() external view returns(IAccessControlManager);

    /******** Mutative Functions ********/
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;
    
    function registerOperators(LibAsset.SystemApprovalPair[] memory _operators) external;

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
    
    function mintBatch(LibAsset.MintData memory _data) external;
    
    function mintUnique(
        LibAsset.MintData memory _data,
        address _uniqueContentContract,
        address to
    ) external;

    function addContractTags(string[] memory _tags) external;

    function removeContractTags(string[] memory _tags) external;

    function addAssetTags(uint256 _id, string[] memory _tags) external;
    
    function removeAssetTags(uint256 _id, string[] memory _tags) external;
}