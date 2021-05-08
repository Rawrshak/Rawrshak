// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IRoyaltyProvider.sol";
import "./IContentSubsystemBase.sol";

interface IContentStorage is IRoyaltyProvider, IContentSubsystemBase {

    /*********************** Events *********************/
    event AssetsAdded(LibAsset.CreateData[] assets);

    /******** View Functions ********/
    function ids(uint256 _tokenId) external view returns (bool);

    function supply(uint256 _tokenId) external view returns (uint256);

    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function uri(uint256 _tokenId) external view returns (string memory);

    function hiddenTokenUri(uint256 _tokenId, uint256 _version) external view  returns (string memory);

    /******** Mutative Functions ********/
    function updateSupply(uint256 _tokenId, uint256 _supply) external;
    
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function setTokenUriPrefix(string memory _tokenUriPrefix) external;

    function setHiddenTokenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
}