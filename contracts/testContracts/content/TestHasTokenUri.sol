// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/HasTokenUri.sol";

contract TestHasTokenUri is HasTokenUri {
    function __TestHasTokenUri_init() external initializer {
        __HasTokenUri_init_unchained();
        __ERC165Storage_init_unchained();
    }

    function tokenUri(uint256 _tokenId, uint256 _version, bool _isPublic) external view returns (string memory) {
        return _tokenUri(_tokenId, _version, _isPublic);
    }

    function setPublicTokenUri(LibAsset.AssetUri[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setPublicTokenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    function setHiddenTokenUri(LibAsset.AssetUri[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setHiddenTokenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }
}