// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./HasRoyalty.sol";
import "./HasTokenUri.sol";
import "./HasContractUri.sol";
import "./ContentSubsystemBase.sol";
import "./interfaces/IContentStorage.sol";
import "../libraries/LibAsset.sol";

contract ContentStorage is IContentStorage, AccessControlUpgradeable, HasRoyalty, HasContractUri, HasTokenUri {    
    /******************** Constants ********************/
    /*
     * IContractUri: 0xc0e24d5e
     * IContentStorage: 0xac73f1f1
     * IContentSubsystemBase: 0x7460af1d
     * IAccessControlUpgradeable: 0x7965db0b
     */

    /***************** Stored Variables *****************/
    mapping(uint256 => bool) public override ids;
    mapping(uint256 => uint256) public override maxSupply;
    mapping(uint256 => uint256) public override supply;

    /******************** Public API ********************/
    function initialize(
        address _receiver,
        uint24 _rate,
        string memory _contractUri
    ) public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __HasTokenUri_init_unchained();
        __HasRoyalty_init_unchained(_receiver, _rate);
        __HasContractUri_init_unchained(_contractUri);
        __ContentSubsystemBase_init_unchained();
        __ContentStorage_init_unchained();
    }
    function __ContentStorage_init_unchained() internal initializer {
        _registerInterface(type(IContentStorage).interfaceId);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

     
    /**
    * @dev assigns the address of contentParent and transfers role of DEFAULT_ADMIN_ROLE to the _contentParent parameter
    * @param _contentParent address to be granted roles
     */
    function setParent(address _contentParent) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setParent(_contentParent);
        grantRole(DEFAULT_ADMIN_ROLE, _contentParent);
        renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());
        
        emit ParentSet(_contentParent);
    }

    /**
    * @dev adds a batch of new tokens, sets their supply and max supply, sets their first hidden and public uris, and sets their 
    * royalties
    * @param _assets an array of LibAsset.CreateData structure objects
    */
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(!ids[_assets[i].tokenId], "Token Id already exists.");
            ids[_assets[i].tokenId] = true;
            supply[_assets[i].tokenId] = 0;

            // If max supply is set to 0, this means there is no mint limit. Set max supply to uint256.max
            if (_assets[i].maxSupply == 0) {
                maxSupply[_assets[i].tokenId] = type(uint256).max;
            } else {
                maxSupply[_assets[i].tokenId] = _assets[i].maxSupply;
            }

            _setPublicUri(_assets[i].tokenId, _assets[i].publicDataUri);
            _setHiddenUri(_assets[i].tokenId, _assets[i].hiddenDataUri);
            
            // if this specific token has a different royalty fees than the contract
            _setTokenRoyalty(_assets[i].tokenId, _assets[i].royaltyReceiver, _assets[i].royaltyRate);
        }

        emit AssetsAdded(_parent(), _assets);
    }

    /**
    * @dev updates the count of total number of the tokens in circulation
    * @param _tokenId uint256 ID of token whose supply will update
    * @param _supply new tally of tokens in circulation
    */
    function updateSupply(uint256 _tokenId, uint256 _supply) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        supply[_tokenId] = _supply;
    }

    /** 
    * @dev adds new versions of tokens to the hiddenUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setHiddenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    /**
    * @dev adds new versions of tokens to the publicUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setPublicUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    /**
    * @dev sets the address of who receives the contract royalties and the rate, which must be between 0 and 1,000,000 (100%). This is used as the defaulty royalty for assets when token royalties are not set.
    * @param _receiver address to receive the royalties
    * @param _rate royalty fee percentage
    */
    function setContractRoyalty(address _receiver, uint24 _rate) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // This can be reset by setting _rate to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractRoyalty(_receiver, _rate);
    }

    /** 
    * @dev sets the address of the receiver and the royalty rate for each individual token in a batch
    * @param _assets array of LibAsset.AssetRoyalties structure objects
    */
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // This overwrites the existing array of contract fees.
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setTokenRoyalty(_assets[i].tokenId, _assets[i].royaltyReceiver, _assets[i].royaltyRate);
        }
    }

    /**
    * @dev returns the token uri for public token info
    * @param _tokenId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function uri(uint256 _tokenId, uint256 _version) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (string memory) {
        return _tokenUri(_tokenId, _version, true);
    }

    /**
    * @dev returns the token uri for private token info
    * @param _tokenId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function hiddenUri(uint256 _tokenId, uint256 _version) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (string memory) {
        return _tokenUri(_tokenId, _version, false);
    }
    
    /**
    * @dev returns the default royalty for the contract assets
    */
    function getContractRoyalty() external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (address receiver, uint24 rate) {
        return (contractRoyalty.receiver, contractRoyalty.rate);
    }
    
    /**
    * @dev returns the royalty receiver address and rate for a token
    */
    function getRoyalty(uint256 _tokenId) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (address receiver, uint24 rate) {
        // If token id doesn't exist, _getRoyalty() will return the contract's default royalty fee. However, that can also
        // be null. In the case of null, there are no royalty fees. 
        return _getRoyalty(_tokenId);
    }

    /**
    * @dev returns the latest uri for public token info
    * @param _tokenId uint256 ID of token to query
    * @param _isPublic boolean of whether the uri is public or not
    */
    function getLatestUriVersion(uint256 _tokenId, bool _isPublic) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        return _getLatestUriVersion(_tokenId, _isPublic);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}