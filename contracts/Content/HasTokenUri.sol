// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./ContentSubsystemBase.sol";

abstract contract HasTokenUri is ContentSubsystemBase {
    using StringsUpgradeable for uint256;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('tokenUriPrefix()')) == 0xc0ac9983
     * bytes4(keccak256('getLatestUriVersion(uint256)')) == 0x0a64da48
     */
    bytes4 private constant _INTERFACE_ID_TOKEN_URI = 0xcac843cb;

    /***************** Stored Variables *****************/
    // Token URI prefix
    string public tokenUriPrefix;

    // Optional mapping for token URIs
    mapping(uint256 => LibAsset.Asset) private tokenUris;
    
    /*********************** Events *********************/
    event TokenUriPrefixUpdated(address indexed parent, string uriPrefix);
    event HiddenTokenUriUpdated(address indexed parent, uint256 indexed id, uint256 indexed version, string uri);

    /******************** Public API ********************/
    function __HasTokenUri_init_unchained(string memory _tokenUriPrefix) internal initializer {
        tokenUriPrefix = _tokenUriPrefix;
        _registerInterface(_INTERFACE_ID_TOKEN_URI);
    }

    /**
     * @dev Returns the latest version of a token uri
     * @param _tokenId uint256 ID of the token to query
     */
    function getLatestUriVersion(uint256 _tokenId) public view returns (uint256) {
        return tokenUris[_tokenId].version;
    }

    /**************** Internal Functions ****************/
    /**
     * @dev Returns an URI for a given token ID.
     * @param _tokenId uint256 ID of the token to query
     */
    function _tokenUri(uint256 _tokenId) internal view returns (string memory) {
        // if prefix don't exist, return "";
        if (bytes(tokenUriPrefix).length == 0) {
            return "";
        }
        return string(abi.encodePacked(tokenUriPrefix, _tokenId.toString()));
    }

    /**
     * @dev Returns an Data URI for a given token ID.
     * Throws if the token ID does not exist. May return an empty string.
     * @param _tokenId uint256 ID of the token to query
     * @param _version uint256 uri version to query
     */
    function _hiddenTokenUri(uint256 _tokenId, uint256 _version) internal view returns (string memory) {
        // if they're requesting a version that doesn't exist, return latest version
        if (_version > tokenUris[_tokenId].version) {
            _version = tokenUris[_tokenId].version;
        }
        return tokenUris[_tokenId].dataUri[_version];
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
        if (tokenUris[_tokenId].dataUri.length == 0) {
            tokenUris[_tokenId].version = 0;
        } else {
            tokenUris[_tokenId].version++;
        }
        tokenUris[_tokenId].dataUri.push(_uri);
        emit HiddenTokenUriUpdated(_parent(), _tokenId, tokenUris[_tokenId].version, _uri);
    }

    /**
     * @dev Internal function to set the token Uri prefix.
     * @param _tokenUriPrefix string Uri prefix to assign
     */
    function _setTokenUriPrefix(string memory _tokenUriPrefix) internal {
        tokenUriPrefix = _tokenUriPrefix;
        emit TokenUriPrefixUpdated(_parent(), _tokenUriPrefix);
    }
    
    uint256[50] private __gap;
}