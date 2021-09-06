// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";
import "./IRoyaltyProvider.sol";
import "./IContentSubsystemBase.sol";
import "./IContractUri.sol";

interface IContentStorage is IRoyaltyProvider, IContractUri {

    /*********************** Events *********************/
    event AssetsAdded(address indexed parent, LibAsset.CreateData[] assets);

    /******** View Functions ********/
    function ids(uint256 _tokenId) external view returns (bool);

    function supply(uint256 _tokenId) external view returns (uint256);

    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function uri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    function hiddenUri(uint256 _tokenId, uint256 _version) external view  returns (string memory);
    
    function getBurnFee(uint256 _tokenId) external view returns(LibAsset.Fee[] memory fees);

    /******** Mutative Functions ********/
    function updateSupply(uint256 _tokenId, uint256 _supply) external;
    
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external;

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external;

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external;

    function setContractBurnFees(LibAsset.Fee[] memory _fee) external;

    function setTokenBurnFeesBatch(LibAsset.AssetBurnFees[] memory _assets) external;
}