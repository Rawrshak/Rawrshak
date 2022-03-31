// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";

interface IPersonalizedAssetsStorage {
    /*********************** Events *********************/
    event PersonalizedUriUpdated(uint256 indexed uniqueId, uint256 indexed version);

    /******** View Functions ********/
    function tokenURI(uint256 _paTokenId, uint256 _version) external view returns (string memory);

    function getRoyalty(uint256 _paTokenId, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount);

    function getMultipleRoyalties(uint256 _paTokenId, uint256 _salePrice) external view returns (address[] memory receivers, uint256[] memory royaltyAmounts);

    function isCreator(uint256 _paTokenId, address _caller) external view returns (bool);

    function isLocked(uint256 _paTokenId) external view returns (bool);

    function getAssetData(uint256 _paTokenId) external view returns (uint256 tokenId, address collectionAddress);

    /******** Mutative Functions ********/
    function setPersonalizedAssetInfo(LibAsset.PersonalizedAssetCreateData memory _data, uint256 _paTokenId, address _caller) external;

    function burnPersonalizedAssetInfo(uint256 _paTokenId) external;

    function setPersonalizedAssetUri(uint256 _paTokenId, string memory _uri) external;

    function setTokenRoyalties(uint256 _paTokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external;
}