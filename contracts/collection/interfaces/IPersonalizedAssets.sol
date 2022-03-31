// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibAsset.sol";

interface IPersonalizedAssets {
    /*********************** Events *********************/
    event Mint(uint256 indexed paTokenId, address operator, LibAsset.PersonalizedAssetCreateData data);

    event Burn(uint256 indexed paTokenId, address operator);

    /******** View Functions ********/
    function originalAssetUri(uint256 _paTokenId, uint256 _version) external view returns(string memory);

    function tokenURI(uint256 _paTokenId, uint256 _version) external view returns(string memory);

    /******** Mutative Functions ********/
    function mint(LibAsset.PersonalizedAssetCreateData memory _data) external;

    function burn(uint256 _paTokenId) external;

    function setPersonalizedAssetUri(uint256 _paTokenId, string memory _uri) external;

    function setTokenRoyalties(uint256 _paTokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external;
}