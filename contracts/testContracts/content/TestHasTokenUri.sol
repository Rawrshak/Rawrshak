// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/HasTokenUri.sol";

contract TestHasTokenUri is HasTokenUri {
    function __TestHasTokenUri_init() external initializer {
        __HasTokenUri_init_unchained();
        __ERC165Storage_init_unchained();
    }

    function tokenUri(uint256 _tokenId, uint256 _version, bool _isPublic) external view returns (string memory) {
        return _tokenUri(_tokenId, _version, _isPublic);
    }

    function setPublicUri(LibAsset.AssetUri[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setPublicUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    function setHiddenUri(LibAsset.AssetUri[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setHiddenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    function getLatestUriVersion(uint256 _id, bool _isPublic) external view returns(uint256) {
        return _getLatestUriVersion(_id, _isPublic);
    }
}