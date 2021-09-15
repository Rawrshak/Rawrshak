// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./ContentSubsystemBase.sol";

abstract contract HasTokenUri is ContentSubsystemBase {
    using StringsUpgradeable for uint256;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('getLatestUriVersion(uint256)')) == 0x57eeb456
     */
    bytes4 private constant INTERFACE_ID_TOKEN_URI = 0x57eeb456;

    /***************** Stored Variables *****************/
    // Optional mapping for token URIs
    mapping(uint256 => LibAsset.Asset) private publicUris;
    mapping(uint256 => LibAsset.Asset) private hiddenUris;
    
    /*********************** Events *********************/
    event PublicUriUpdated(address indexed parent, uint256 indexed id, uint256 indexed version);
    event HiddenUriUpdated(address indexed parent, uint256 indexed id, uint256 indexed version);

    /******************** Public API ********************/
    function __HasTokenUri_init_unchained() internal initializer {
        _registerInterface(INTERFACE_ID_TOKEN_URI);
    }

    /**
     * @dev Returns the latest version of a token uri
     * @param _tokenId uint256 ID of the token to query
     * @param _isPublic bool get the private or public token id
     */
    function getLatestUriVersion(uint256 _tokenId, bool _isPublic) public view returns (uint256) {
        if (_isPublic) {
            return publicUris[_tokenId].version;
        }
        return hiddenUris[_tokenId].version;
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Returns an URI for a given token ID. Throws if token id doesn't exist
     * @param _tokenId uint256 ID of the token to query
     * @param _version uint256 uri version to query
     * @param _isPublic bool get the private or public token id
     */
    function _tokenUri(uint256 _tokenId, uint256 _version, bool _isPublic) internal view returns (string memory) {
        if (_isPublic) {
            // if they're requesting a version that doesn't exist, return latest version
            if (_version > publicUris[_tokenId].version) {
                _version = publicUris[_tokenId].version;
            }
            return publicUris[_tokenId].dataUri[_version];
        }
        // if they're requesting a version that doesn't exist, return latest version
        if (_version > hiddenUris[_tokenId].version) {
            _version = hiddenUris[_tokenId].version;
        }
        return hiddenUris[_tokenId].dataUri[_version];
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setHiddenUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and get updated, asset owners can
        // opt to use older versions of assets.

        // Check if _uri is an empty string. If it is, return early and don't add anything. This means that
        // the developer cannot delete a uri that has been set.
        bytes memory tempEmptyStringTest = bytes(_uri); // Uses memory
        if (tempEmptyStringTest.length == 0) {
            return;
        }

        if (hiddenUris[_tokenId].dataUri.length == 0) {
            hiddenUris[_tokenId].version = 0;
        } else {
            hiddenUris[_tokenId].version++;
        }
        hiddenUris[_tokenId].dataUri.push(_uri);
        emit HiddenUriUpdated(_parent(), _tokenId, hiddenUris[_tokenId].version);
    }

    /**
     * @dev Internal function to set the Public Token Uri prefix.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setPublicUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and get updated, asset owners can
        // opt to use older versions of assets.
        if (publicUris[_tokenId].dataUri.length == 0) {
            publicUris[_tokenId].version = 0;
        } else {
            publicUris[_tokenId].version++;
        }
        publicUris[_tokenId].dataUri.push(_uri);
        emit PublicUriUpdated(_parent(), _tokenId, publicUris[_tokenId].version);
    }
    
    uint256[50] private __gap;
}