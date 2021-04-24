// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";


import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ISalvageStorage.sol";
// import "./interfaces/IEscrowDistributions.sol";

contract SalvageStorage is ISalvageStorage, AccessControlUpgradeable, ERC165StorageUpgradeable {

    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibSalvage.SalvageableAsset) public salvageableAssets;

    /*********************** Events *********************/
    event ManagerRegistered(address _manager, address _storage);
    event SalvageableAssetsAdded(LibSalvage.SalvageableAsset[] assets);
    
    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __SalvageStorage_init() public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
    
    function registerManager(address _manager) external override checkPermissions(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager, address(this));
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function addSalvageableAssetBatch(LibSalvage.SalvageableAsset[] memory _assets) external override checkPermissions(DEFAULT_ADMIN_ROLE) {
        require(_assets.length > 0, "Invalid input length.");

        for (uint256 i = 0; i < _assets.length; ++i) {
            LibSalvage.verify(_assets[i]);
            uint256 id = _getId(_assets[i].asset.content, _assets[i].asset.tokenId);

            // This will overwrite whatever is there initially
            salvageableAssets[id].asset.content = _assets[i].asset.content;
            salvageableAssets[id].asset.tokenId = _assets[i].asset.tokenId;
            salvageableAssets[id].salvageType = _assets[i].salvageType;
            if (salvageableAssets[id].rewards.length > 0) {
                delete salvageableAssets[id].rewards;
            }
            for (uint256 j = 0; j < _assets[id].rewards.length; ++j) {
                salvageableAssets[id].rewards.push(_assets[i].rewards[j]);
            }
        }

        emit SalvageableAssetsAdded(_assets);
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