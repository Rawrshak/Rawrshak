// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContentStorage {
    function setParent(address _parent) external;

    function isOperatorApprovedForAll(address _operator) external view returns (bool);    
    
    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) external;

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function tokenUri(uint256 _tokenId, uint256 _version) external view  returns (string memory);

    function setTokenUriPrefix(string memory _tokenUriPrefix) external;

    function setTokenUriBatch(LibAsset.AssetUri[] memory _assets) external;
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) ;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
}