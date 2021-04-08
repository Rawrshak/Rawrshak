// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";

contract HasTokenURI is ERC165Storage {
    using Strings for uint256;
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('tokenURIPrefix()')) == 0xc0ac9983
     */
    bytes4 private constant _INTERFACE_ID_TOKEN_URI = 0xc0ac9983;

    /***************** Stored Variables *****************/
    // Token URI prefix
    string public tokenURIPrefix;

    // Optional mapping for token URIs
    mapping(uint256 => string) private tokenURIs;

    /******************** Public API ********************/
    constructor(string memory _tokenURIPrefix) {
        tokenURIPrefix = _tokenURIPrefix;
        _registerInterface(_INTERFACE_ID_TOKEN_URI);
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Returns an URI for a given token ID.
     * Throws if the token ID does not exist. May return an empty string.
     * @param tokenId uint256 ID of the token to query
     */
    function _tokenURI(uint256 tokenId) internal view returns (string memory) {
        // if prefix doesn't exist, return the token uri. This can be null.
        if (bytes(tokenURIPrefix).length == 0) {
            return tokenURIs[tokenId];
        }
        
        // if both prefix and token uri exist, concatinate prefix and token uri
        if (bytes(tokenURIs[tokenId]).length > 0) {
            return string(abi.encodePacked(tokenURIPrefix, tokenURIs[tokenId]));
        }

        // if there's a prefix, but no token uri, concatinate the token id
        return string(abi.encodePacked(tokenURIPrefix, tokenId.toString()));
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param tokenId uint256 ID of the token to set its URI
     * @param uri string URI to assign
     */
    function _setTokenURI(uint256 tokenId, string memory uri) internal {
        tokenURIs[tokenId] = uri;
    }

    /**
     * @dev Internal function to set the token URI prefix.
     * @param _tokenURIPrefix string URI prefix to assign
     */
    function _setTokenURIPrefix(string memory _tokenURIPrefix) internal {
        tokenURIPrefix = _tokenURIPrefix;
    }
}