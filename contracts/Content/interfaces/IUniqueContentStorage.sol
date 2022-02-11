// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";

interface IUniqueContentStorage {
    /*********************** Events *********************/
    event UniqueUriUpdated(uint256 indexed uniqueId, uint256 indexed version);

    /******** View Functions ********/
    function tokenURI(uint256 _uniqueId, uint256 _version) external view returns (string memory);

    function verifyRoyalties(address[] memory _royaltyReceivers, uint24[] memory _royaltyRates, uint256 _originalRoyaltyRate) external pure returns (bool);

    function getRoyalty(uint256 _uniqueId, uint256 _salePrice) external view returns (address receiver, uint256 royaltyAmount);

    function getMultipleRoyalties(uint256 _uniqueId, uint256 _salePrice) external view returns (address[] memory receivers, uint256[] memory royaltyAmounts);

    function isCreator(uint256 _uniqueId, address _caller) external view returns (bool);

    function isLocked(uint256 _uniqueId) external view returns (bool);

    function getAssetData(uint256 _uniqueId) external view returns (uint256 tokenId, address contentAddress);

    /******** Mutative Functions ********/
    function setUniqueAssetInfo(LibAsset.UniqueAssetCreateData memory _data, uint256 _uniqueId, address _caller) external;

    function burnUniqueAssetInfo(uint256 _uniqueId) external;

    function setUniqueUri(uint256 _uniqueId, string memory _uri) external;

    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external;
}