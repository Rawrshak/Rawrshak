// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../LibRoyalties.sol";
import "../LibAsset.sol";

interface IContentManager {
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function setContractUri(string memory _contractUri) external;
    
    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) external;
    
    function setTokenUriPrefix(string memory _tokenUriPrefix) external;

    function setTokenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
    
    function mintBatch(LibAsset.MintData memory _data) external;
    
    function mintUnique(
        LibAsset.MintData memory _data,
        address _uniqueContentContract,
        address to
    ) external;
}