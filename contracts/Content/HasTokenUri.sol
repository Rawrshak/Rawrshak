// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./LibAsset.sol";

contract HasTokenURI {
    using Strings for uint256;

    /***************** Stored Variables *****************/
    // Token URI prefix
    string public tokenURIPrefix;

    // Optional mapping for token URIs
    // mapping(uint256 => string) private tokenURIs;
    mapping(uint256 => LibAsset.Asset) private tokenURIs;
    

    /******************** Public API ********************/
    constructor(string memory _tokenURIPrefix) {
        tokenURIPrefix = _tokenURIPrefix;
    }

    function getLatestTokenVersion(uint256 _tokenId) public view returns (uint256) {
        return tokenURIs[_tokenId].version;
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Returns an URI for a given token ID.
     * Throws if the token ID does not exist. May return an empty string.
     * @param _tokenId uint256 ID of the token to query
     * @param _version uint256 uri version to query
     */
    function _tokenURI(uint256 _tokenId, uint256 _version) internal view returns (string memory) {
        // if prefix doesn't exist, return the token uri. This can be null.
        if (bytes(tokenURIPrefix).length == 0) {
            return tokenURIs[_tokenId].dataUri[_version];
        }
        
        // if both prefix and token uri exist, concatinate prefix and token uri
        if (bytes(tokenURIs[_tokenId].dataUri[_version]).length >= 0) {
            return string(abi.encodePacked(tokenURIPrefix, tokenURIs[_tokenId].dataUri[_version]));
        }

        // if there's a prefix, but no token uri, concatinate the token id
        return string(abi.encodePacked(tokenURIPrefix, _tokenId.toString()));
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setTokenUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and change, owners can use older
        // versions of assets that they like more or non-breaking change assets.
        if (bytes(tokenURIs[_tokenId].dataUri[0]).length == 0) {
            tokenURIs[_tokenId].version = 0;
        } else {
            tokenURIs[_tokenId].version++;
        }
        tokenURIs[_tokenId].dataUri.push(_uri);
    }

    /**
     * @dev Internal function to set the token URI prefix.
     * @param _tokenURIPrefix string URI prefix to assign
     */
    function _setTokenURIPrefix(string memory _tokenURIPrefix) internal {
        tokenURIPrefix = _tokenURIPrefix;
    }
}