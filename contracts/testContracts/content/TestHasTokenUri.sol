// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/HasTokenUri.sol";

contract TestHasTokenUri is HasTokenUri {
    function __TestHasTokenUri_init(string memory _tokenUriPrefix) external initializer {
        __HasTokenUri_init_unchained(_tokenUriPrefix);
        __ERC165Storage_init_unchained();
    }

    function tokenUri(uint256 _tokenId, uint256 _version) external view returns (string memory) {
        return _tokenUri(_tokenId, _version);
    }

    function setTokenUriPrefix(string memory _tokenUriPrefix) external {
        // this can be set to nothing.
        _setTokenUriPrefix(_tokenUriPrefix);
    }

    function setTokenUriBatch(LibAsset.AssetUri[] memory _assets) external {
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setTokenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }
}