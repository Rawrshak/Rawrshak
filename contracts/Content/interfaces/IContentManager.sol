// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContentManager {

    /******** Mutative Functions ********/
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;
    
    function registerSystem(LibAsset.SystemApprovalPair[] memory _operators) external;
    
    function setTokenUriPrefix(string memory _tokenUriPrefix) external;

    function setHiddenTokenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
    
    function mintBatch(LibAsset.MintData memory _data) external;
    
    function mintUnique(
        LibAsset.MintData memory _data,
        address _uniqueContentContract,
        address to
    ) external;
}