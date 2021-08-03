// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./ContentSubsystemBase.sol";

abstract contract HasTokenUri is ContentSubsystemBase {
    using StringsUpgradeable for uint256;

    // Todo: Fix this
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('getLatestUriVersion(uint256)')) == 0x0a64da48
     */
    bytes4 private constant _INTERFACE_ID_TOKEN_URI = 0xcac843cb;

    /***************** Stored Variables *****************/
    // Optional mapping for token URIs
    mapping(uint256 => LibAsset.Asset) private publicTokenUris;
    mapping(uint256 => LibAsset.Asset) private hiddenTokenUris;
    
    /*********************** Events *********************/
    event PublicTokenUriUpdated(address indexed parent, uint256 indexed id, uint256 indexed version);
    event HiddenTokenUriUpdated(address indexed parent, uint256 indexed id, uint256 indexed version);

    /******************** Public API ********************/
    function __HasTokenUri_init_unchained() internal initializer {
        _registerInterface(_INTERFACE_ID_TOKEN_URI);
    }

    /**
     * @dev Returns the latest version of a token uri
     * @param _tokenId uint256 ID of the token to query
     * @param _isPublic bool get the private or public token id
     */
    function getLatestUriVersion(uint256 _tokenId, bool _isPublic) public view returns (uint256) {
        if (_isPublic) {
            return publicTokenUris[_tokenId].version;
        }
        return hiddenTokenUris[_tokenId].version;
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
            if (_version > publicTokenUris[_tokenId].version) {
                _version = publicTokenUris[_tokenId].version;
            }
            return publicTokenUris[_tokenId].dataUri[_version];
        }
        // if they're requesting a version that doesn't exist, return latest version
        if (_version > hiddenTokenUris[_tokenId].version) {
            _version = hiddenTokenUris[_tokenId].version;
        }
        return hiddenTokenUris[_tokenId].dataUri[_version];
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     * Reverts if the token ID does not exist.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setHiddenTokenUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and get updated, asset owners can
        // opt to use older versions of assets.
        if (hiddenTokenUris[_tokenId].dataUri.length == 0) {
            hiddenTokenUris[_tokenId].version = 0;
        } else {
            hiddenTokenUris[_tokenId].version++;
        }
        hiddenTokenUris[_tokenId].dataUri.push(_uri);
        emit HiddenTokenUriUpdated(_parent(), _tokenId, hiddenTokenUris[_tokenId].version);
    }

    /**
     * @dev Internal function to set the Public Token Uri prefix.
     * @param _tokenId uint256 ID of the token to set its URI
     * @param _uri string URI to assign
     */
    function _setPublicTokenUri(uint256 _tokenId, string memory _uri) internal {
        // Assets are permanent and therefore the urls must be permanent. To account for updating assets,
        // we introduce a versioning system. As game assets can break and get updated, asset owners can
        // opt to use older versions of assets.
        if (publicTokenUris[_tokenId].dataUri.length == 0) {
            publicTokenUris[_tokenId].version = 0;
        } else {
            publicTokenUris[_tokenId].version++;
        }
        publicTokenUris[_tokenId].dataUri.push(_uri);
        emit PublicTokenUriUpdated(_parent(), _tokenId, publicTokenUris[_tokenId].version);
    }
    
    uint256[50] private __gap;
}