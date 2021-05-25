// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./ContentSubsystemBase.sol";
import "../libraries/LibAsset.sol";
import "./SystemsRegistry.sol";
import "../utils/LibConstants.sol";
import "./interfaces/IContentStorage.sol";

contract ContentStorage is IContentStorage, AccessControlUpgradeable, HasRoyalties, HasTokenUri {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('contractRoyalties()')) == 0xFFFFFFFF
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_STORAGE = 0x00000001;
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /***************** Stored Variables *****************/
    mapping(uint256 => bool) public override ids;
    mapping(uint256 => uint256) public override maxSupply;
    mapping(uint256 => uint256) public override supply;

    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __ContentStorage_init(
        string memory _tokenUriPrefix,
        LibRoyalties.Fees[] memory _contractFees
    ) public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __HasTokenUri_init_unchained(_tokenUriPrefix);
        __HasRoyalties_init_unchained(_contractFees);
        __ContentSubsystemBase_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(OWNER_ROLE, _msgSender());
    }

    function setParent(address _contentParent) external override checkPermissions(OWNER_ROLE) {
        require(_contentParent.isContract(), "Address is not a contract.");
        require(_contentParent.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        _setParent(_contentParent);
        grantRole(OWNER_ROLE, _contentParent);
        
        emit ParentSet(_contentParent);
    }

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external override checkPermissions(OWNER_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(!ids[_assets[i].tokenId], "Token Id already exists.");
            ids[_assets[i].tokenId] = true;
            supply[_assets[i].tokenId] = 0;
            maxSupply[_assets[i].tokenId] = _assets[i].maxSupply;

            _setHiddenTokenUri(_assets[i].tokenId, _assets[i].dataUri);
            
            // if this specific token has a different royalty fees than the contract
            if (_assets[i].fees.length != 0) {
                _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
            }
        }

        emit AssetsAdded(_parent(), _assets);
    }

    function updateSupply(uint256 _tokenId, uint256 _supply) external override checkPermissions(OWNER_ROLE) {
        supply[_tokenId] = _supply;
    }

    // returns the token uri for public token info
    function uri(uint256 _tokenId) external view override checkPermissions(OWNER_ROLE) returns (string memory) {
        return _tokenUri(_tokenId);
    }

    // returns the token uri for private token info
    function hiddenTokenUri(uint256 _tokenId, uint256 _version) external view override checkPermissions(OWNER_ROLE) returns (string memory) {
        return _hiddenTokenUri(_tokenId, _version);
    }

    function setTokenUriPrefix(string memory _tokenUriPrefix) external override checkPermissions(OWNER_ROLE) {
        // this can be set to nothing.
        _setTokenUriPrefix(_tokenUriPrefix);
    }

    function setHiddenTokenUriBatch(LibAsset.AssetUri[] memory _assets) external override checkPermissions(OWNER_ROLE) {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setHiddenTokenUri(_assets[i].tokenId, _assets[i].uri);
        }
    }
    
    function getRoyalties(uint256 _tokenId) external view override checkPermissions(OWNER_ROLE) returns (LibRoyalties.Fees[] memory) {
        // If token id doesn't exist or there isn't a royalty fee attached to this specific token, 
        // _getRoyalties() will return the contract's default royalty fee. However, that can also
        // be null. In the case of null, there are no royalty fees. 
        return _getRoyalties(_tokenId);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external override checkPermissions(OWNER_ROLE) {
        // This can be reset by setting _fee to an empty string.
        // This overwrites the existing array of contract fees.
        _setContractRoyalties(_fee);
    }

    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override checkPermissions(OWNER_ROLE) {
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