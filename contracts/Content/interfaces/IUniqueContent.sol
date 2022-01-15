// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";

interface IUniqueContent {
    /*********************** Events *********************/
    event Mint(uint256 uniqueId, address operator, LibAsset.UniqueAssetCreateData data);

    event Burn(uint256 uniqueId, address operator);

    event UniqueUriUpdated(uint256 indexed uniqueId, uint256 indexed version);

    /******** View Functions ********/
    function originalAssetUri(uint256 _uniqueId, uint256 _version) external view returns(string memory);

    function tokenURI(uint256 _uniqueId, uint256 _version) external view returns(string memory);

    /******** Mutative Functions ********/
    function mint(LibAsset.UniqueAssetCreateData memory _data) external;

    function burn(uint256 _uniqueId) external;

    function setUniqueUri(uint256 _uniqueId, string memory _uri) external;

    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external;
}