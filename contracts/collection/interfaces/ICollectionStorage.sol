// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";
import "./ICollectionSubsystemBase.sol";
import "./IContractUri.sol";

interface ICollectionStorage is IContractUri {

    /*********************** Events *********************/
    event AssetsAdded(address indexed parent, uint256[] tokenIds, LibAsset.CreateData[] assets);

    /******** View Functions ********/
    function exists(uint256 _tokenId) external view returns (bool);

    function supply(uint256 _tokenId) external view returns (uint256);

    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function uri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    function hiddenUri(uint256 _tokenId, uint256 _version) external view  returns (string memory);

    function getContractRoyalty() external view returns (address, uint24);
    
    function getRoyalty(uint256 _tokenId) external view returns (address, uint24);

    function getLatestUriVersion(uint256 _tokenId, bool _isPublic) external view returns (uint256);

    /******** Mutative Functions ********/
    function updateSupply(uint256 _tokenId, uint256 _supply) external;
    
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalty(address _receiver, uint24 _rate) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;
}