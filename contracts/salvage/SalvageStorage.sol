// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ISalvageStorage.sol";
import "../content/interfaces/IContent.sol";
import "../utils/LibConstants.sol";
// import "./interfaces/IEscrowDistributions.sol";

contract SalvageStorage is ISalvageStorage, AccessControlUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using LibSalvage for *;

    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibSalvage.SalvageableAsset) public salvageableAssets;
    EnumerableSetUpgradeable.AddressSet contentContracts;

    /*********************** Events *********************/
    event ManagerRegistered(address _manager, address _storage);
    event ContentContractRegistered(address _address);
    event SalvageableAssetsAdded(LibSalvage.SalvageableAsset[] assets, uint256[] ids);
    
    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __SalvageStorage_init() public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _registerInterface(LibConstants._INTERFACE_ID_SALVAGE_STORAGE);
    }
    
    function registerManager(address _manager) external override checkPermissions(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager, address(this));
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function registerContent(address _content) external override {
        require(_content.isContract(), "Content address is not an contract");
        require(_content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Contract is not a Content Contract");
        // check if I have the correct permissions
        require(IContent(_content).isSystemOperator(address(this)), "No contract permissions");
        
        contentContracts.add(_content);
    }

    function addSalvageableAssetBatch(LibSalvage.SalvageableAsset[] memory _assets) external override checkPermissions(DEFAULT_ADMIN_ROLE) {
        require(_assets.length > 0, "Invalid input length.");

        uint256[] memory ids = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(contentContracts.contains(_assets[i].asset.content), "Invalid Content Contract permissions");
            _assets[i].verify();
            uint256 id = _getId(_assets[i].asset.content, _assets[i].asset.tokenId);

            // This will overwrite whatever is there initially
            salvageableAssets[id].asset.content = _assets[i].asset.content;
            salvageableAssets[id].asset.tokenId = _assets[i].asset.tokenId;
            salvageableAssets[id].salvageType = _assets[i].salvageType;
            if (salvageableAssets[id].rewards.length > 0) {
                delete salvageableAssets[id].rewards;
            }

            for (uint256 j = 0; j < _assets[id].rewards.length; ++j) {
                require(contentContracts.contains(_assets[i].rewards[j].asset.content), "Invalid Content Contract permissions - rewards");
                salvageableAssets[id].rewards.push(_assets[i].rewards[j]);
            }
            ids[i] = id;
        }

        emit SalvageableAssetsAdded(_assets, ids);
    }

    function salvage(LibSalvage.AssetData memory _asset, uint256 _amount) external {
        // 1. Check if the asset is salvageable
        // 2. Check amount > 0
        // 3. check if sender has the asset and the amount
        // 4. call salvage(), which should return the assets to mint
        // 5. burn the asset first
        // 6. mint the rewards
    }

    function getId(LibSalvage.AssetData calldata _asset) external pure override returns(uint256) {
        return _getId(_asset.content, _asset.tokenId);
    } 

    /**************** Internal Functions ****************/
    function _getId(address _content, uint256 _tokenId) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_content, _tokenId)));
    }

    uint256[50] private __gap;
}