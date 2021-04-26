// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ISalvageStorage.sol";
import "../content/interfaces/IContent.sol";
import "../utils/LibConstants.sol";
// import "./interfaces/IEscrowDistributions.sol";

contract SalvageStorage is ISalvageStorage, AccessControlUpgradeable, PausableUpgradeable, ERC165StorageUpgradeable {
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
    event SalvageableAssetsUpdated(LibSalvage.SalvageableAsset[] assets, uint256[] ids);
    event AssetSalvaged(LibSalvage.AssetData asset, uint256 amount);
    event AssetSalvagedBatch(LibSalvage.AssetData[] assets, uint256[] amounts);
    event ContentRegistered(address content);
    
    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __SalvageStorage_init() public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        __Pausable_init_unchained();
        _pause();
        _registerInterface(LibConstants._INTERFACE_ID_SALVAGE_STORAGE);
    }
    
    function registerManager(address _manager) external override whenPaused() checkPermissions(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager, address(this));
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function registerContent(address _content) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_content.isContract(), "Content address is not an contract");
        require(_content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Contract is not a Content Contract");
        // check if I have the correct permissions
        require(IContent(_content).isSystemOperator(address(this)), "No contract permissions");
        
        contentContracts.add(_content);
        
        emit ContentRegistered(_content);
    }

    function managerSetPause(bool _setPause) external override checkPermissions(MANAGER_ROLE) {
        if (_setPause) {
            _pause();
        } else {
            _unpause();
        }
    }

    function setSalvageableAssetBatch(LibSalvage.SalvageableAsset[] memory _assets) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_assets.length > 0, "Invalid input length.");

        uint256[] memory ids = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(contentContracts.contains(_assets[i].asset.content), "Invalid Content Contract permissions");
            _assets[i].verifySalvageableAsset();
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

        emit SalvageableAssetsUpdated(_assets, ids);
    }

    function salvage(LibSalvage.AssetData memory _asset, uint256 _amount) external override whenNotPaused() {
        _validateInput(_asset, _amount);
        
        // 4. call salvage(), which should return the assets to mint
        (LibSalvage.SalvageReward[] memory materials, uint256[] memory amounts) = salvageableAssets[_getId(_asset.content, _asset.tokenId)].salvage(_amount);

        _burn(_asset, _amount);

        _mint(materials, amounts);

        emit AssetSalvaged(_asset, _amount);
    }
    

    function salvageBatch(LibSalvage.AssetData[] memory _assets, uint256[] memory _amounts) external override whenNotPaused() {
        require(_assets.length == _amounts.length && _amounts.length > 0, "Invalid input lengths.");
        
        for (uint256 i = 0; i < _assets.length; ++i) {
            _validateInput(_assets[i], _amounts[i]);
            
            // 4. call salvage(), which should return the assets to mint
            (LibSalvage.SalvageReward[] memory materials, uint256[] memory materialAmounts) = salvageableAssets[_getId(_assets[i].content, _assets[i].tokenId)].salvage(_amounts[i]);

            _burn(_assets[i], _amounts[i]);

            _mint(materials, materialAmounts);
        }
        
        emit AssetSalvagedBatch(_assets, _amounts);
    }

    function getId(LibSalvage.AssetData calldata _asset) external pure override returns(uint256) {
        return _getId(_asset.content, _asset.tokenId);
    } 

    /**************** Internal Functions ****************/
    function _getId(address _content, uint256 _tokenId) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_content, _tokenId)));
    }

    function _validateInput(LibSalvage.AssetData memory _asset, uint256 _amount) internal view {
        // 1. Check if the asset is salvageable
        require(salvageableAssets[_getId(_asset.content, _asset.tokenId)].rewards.length > 0, "Item not salvageable");
        // 2. Check amount > 0
        require(_amount > 0, "Invalid amount");
        // 3. check if sender has the asset and the amount
        require(IERC1155Upgradeable(_asset.content).balanceOf(_msgSender(), _asset.tokenId) > _amount, "Not enough owned asset");
    }

    function _burn(LibSalvage.AssetData memory _asset, uint256 _burnAmount) internal {

        // 5. burn the asset first
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        burnData.tokenIds = new uint256[](1);
        burnData.amounts = new uint256[](1);
        burnData.tokenIds[0] = _asset.tokenId;
        burnData.amounts[0] = _burnAmount;
        IContent(_asset.content).burnBatch(burnData);
    }

    function _mint(LibSalvage.SalvageReward[] memory _materials, uint256[] memory _materialAmounts) internal {
        // 6. mint the rewards
        // note: rewards can be from different content contracts. I don't know if we should limit this or not.
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        for (uint i = 0; i < 1; ++i) {
            mintData.tokenIds = new uint256[](1);
            mintData.amounts = new uint256[](1);
            mintData.tokenIds[0] = _materials[i].asset.tokenId;
            mintData.amounts[0] = _materialAmounts[i];
            IContent(_materials[i].asset.content).mintBatch(mintData);
        }
    }

    uint256[50] private __gap;
}