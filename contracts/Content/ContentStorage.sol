// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./HasContractUri.sol";
import "./ContentSubsystemBase.sol";
import "./interfaces/IContentStorage.sol";
import "../libraries/LibAsset.sol";
import "../utils/LibConstants.sol";

contract ContentStorage is IContentStorage, AccessControlUpgradeable, HasRoyalties, HasContractUri, HasTokenUri {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * IContractUri == 0xc0e24d5e
     * IRoyaltyProvider == 0xbb3bafd6
     * bytes4(keccak256('ids(uint256)')) == 0xfac333ac
     * bytes4(keccak256('supply(uint256)')) == 0x35403023
     * bytes4(keccak256('maxSupply(uint256)')) == 0x869f7594
     * bytes4(keccak256('uri(uint256,uint256)')) == 0xbe234d42
     * bytes4(keccak256('hiddenUri(uint256,uint256)')) == 0x47bb1ace
     * bytes4(keccak256('updateSupply(uint256,uint256)')) == 0x9e2dcbfd
     * bytes4(keccak256('addAssetBatch(LibAsset.CreateData[] memory)')) == 0x4c45670b
     * bytes4(keccak256('setHiddenUriBatch(LibAsset.AssetUri[] memory)')) == 0x8c8e95fa
     * bytes4(keccak256('setPublicUriBatch(LibAsset.AssetUri[] memory)')) == 0xc6c6617e
     * bytes4(keccak256('setContractRoyalties(LibRoyalties.Fees[] memory)')) == 0xa2de9fbe
     * bytes4(keccak256('setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory)')) == 0x5090ab4f
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_STORAGE = A133AF9C;

    /***************** Stored Variables *****************/
    mapping(uint256 => bool) public override ids;
    mapping(uint256 => uint256) public override maxSupply;
    mapping(uint256 => uint256) public override supply;

    /******************** Public API ********************/
    function __ContentStorage_init(
        LibRoyalties.Fees[] memory _contractFees,
        string memory _contractUri
    ) public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __HasTokenUri_init_unchained();
        __HasRoyalties_init_unchained(_contractFees);
        __HasContractUri_init_unchained(_contractUri);
        __ContentSubsystemBase_init_unchained();
        __ContentStorage_init_unchained();
    }

    function __ContentStorage_init_unchained() internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function setParent(address _contentParent) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_contentParent.isContract(), "Address is not a contract.");
        require(_contentParent.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        _setParent(_contentParent);
        grantRole(DEFAULT_ADMIN_ROLE, _contentParent);
        renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());
        
        emit ParentSet(_contentParent);
    }

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
            if (_assets[i].fees.length != 0) {
                _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
            }
        }

        emit AssetsAdded(_parent(), _assets);
    }

    function updateSupply(uint256 _tokenId, uint256 _supply) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        supply[_tokenId] = _supply;
    }

    // returns the token uri for public token info
    function uri(uint256 _tokenId, uint256 _version) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (string memory) {
        return _tokenUri(_tokenId, _version, true);
    }

    // returns the token uri for private token info
    function hiddenUri(uint256 _tokenId, uint256 _version) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (string memory) {
        return _tokenUri(_tokenId, _version, false);
    }

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setHiddenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }

    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setPublicUri(_assets[i].tokenId, _assets[i].uri);
        }
    }
    
    function getRoyalties(uint256 _tokenId) external view override onlyRole(DEFAULT_ADMIN_ROLE) returns (LibRoyalties.Fees[] memory) {
        // If token id doesn't exist or there isn't a royalty fee attached to this specific token, 
        // _getRoyalties() will return the contract's default royalty fee. However, that can also
        // be null. In the case of null, there are no royalty fees. 
        return _getRoyalties(_tokenId);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // This can be reset by setting _fee to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractRoyalties(_fee);
    }

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        // This overwrites the existing array of contract fees.
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}