// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContentStorage {
    function setParent(address _parent) external;

    function getIds(uint256 _tokenId) external view returns (bool);

    function getSupply(uint256 _tokenId) external view returns (uint256);

    function getMaxSupply(uint256 _tokenId) external view returns (uint256);

    function updateSupply(uint256 _tokenId, uint256 _supply) external;

    function isSystemOperatorApproved(address _user, address _operator) external view returns (bool);
    
    function registerSystems(LibAsset.SystemApprovalPair[] memory _operators) external;
    
    function userApprove(address _user, bool _approved) external;

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function uri(uint256 _tokenId) external view returns (string memory);

    function tokenDataUri(uint256 _tokenId, uint256 _version) external view  returns (string memory);

    function setTokenUriPrefix(string memory _tokenUriPrefix) external;

    function setTokenDataUriBatch(LibAsset.AssetUri[] memory _assets) external;
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) ;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
}