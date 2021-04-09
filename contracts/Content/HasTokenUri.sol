// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "./LibAsset.sol";

abstract contract HasTokenUri is ERC165StorageUpgradeable {
    using StringsUpgradeable for uint256;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('tokenUriPrefix()')) == 0xc0ac9983
     * bytes4(keccak256('getLatestTokenVersion(uint256)')) == 0x0a64da48
     */
    bytes4 private constant _INTERFACE_ID_TOKEN_URI = 0xcac843cb;

    /***************** Stored Variables *****************/
    // Token URI prefix
    string public tokenUriPrefix;

    // Optional mapping for token URIs
    mapping(uint256 => LibAsset.Asset) private tokenUris;
    
    /*********************** Events *********************/
    event TokenUriPrefixUpdated(string uriPrefix);
    event TokenUriUpdated(string uri);

    /******************** Public API ********************/
    function __HasTokenUri_init_unchained(string memory _tokenUriPrefix) internal initializer {
        tokenUriPrefix = _tokenUriPrefix;
        _registerInterface(_INTERFACE_ID_TOKEN_URI);
    }

    /**
     * @dev Returns the latest version of a token uri
     * @param _tokenId uint256 ID of the token to query
     */
    function getLatestTokenVersion(uint256 _tokenId) public view returns (uint256) {
        return tokenUris[_tokenId].version;
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Returns an URI for a given token ID.
     * Throws if the token ID does not exist. May return an empty string.
     * @param _tokenId uint256 ID of the token to query
     * @param _version uint256 uri version to query
     */
    function _tokenUri(uint256 _tokenId, uint256 _version) internal view returns (string memory) {
        // if prefix doesn't exist, return the token uri. This can be null.
        if (bytes(tokenUriPrefix).length == 0) {
            return tokenUris[_tokenId].dataUri[_version];
        }
        
        // if both prefix and token uri exist, concatinate prefix and token uri
        if (bytes(tokenUris[_tokenId].dataUri[_version]).length >= 0) {
            return string(abi.encodePacked(tokenUriPrefix, tokenUris[_tokenId].dataUri[_version]));
        }

        // if there's a prefix, but no token uri, concatinate the token id
        return string(abi.encodePacked(tokenUriPrefix, _tokenId.toString()));
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setTokenUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and get updated, asset owners can
        // opt to use older versions of assets.
        if (bytes(tokenUris[_tokenId].dataUri[0]).length == 0) {
            tokenUris[_tokenId].version = 0;
        } else {
            tokenUris[_tokenId].version++;
        }
        tokenUris[_tokenId].dataUri.push(_uri);
        emit TokenUriUpdated(_uri);
    }

    /**
     * @dev Internal function to set the token Uri prefix.
     * @param _tokenUriPrefix string Uri prefix to assign
     */
    function _setTokenUriPrefix(string memory _tokenUriPrefix) internal {
        tokenUriPrefix = _tokenUriPrefix;
        emit TokenUriPrefixUpdated(_tokenUriPrefix);
    }
    
    uint256[50] private __gap;
}