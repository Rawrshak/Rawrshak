// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
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
    event AssetSalvaged(LibSalvage.AssetData asset, uint256 amount);
    event AssetSalvagedBatch(LibSalvage.AssetData[] assets, uint256[] amounts);
    
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

        emit SalvageableAssetsAdded(_assets, ids);
    }

    function salvage(LibSalvage.AssetData memory _asset, uint256 _amount) external {
        _validateInput(_asset, _amount);
        
        // 4. call salvage(), which should return the assets to mint
        (LibSalvage.SalvageReward[] memory materials, uint256[] memory amounts) = salvageableAssets[_getId(_asset.content, _asset.tokenId)].salvage(_amount);


        emit AssetSalvaged(_asset, _amount);
    }
    

    function salvageBatch(LibSalvage.AssetData[] memory _assets, uint256[] memory _amounts) external {
        require(_assets.length == _amounts.length && _amounts.length > 0, "Invalid input lengths.");
        
        
        LibAsset.BurnData memory burnData;
        LibAsset.MintData memory mintData;

        for (uint256 i = 0; i < _assets.length; ++i) {
            _validateInput(_assets[i], _amounts[i]);
            
            // 4. call salvage(), which should return the assets to mint
            (LibSalvage.SalvageReward[] memory materials, uint256[] memory materialAmounts) = salvageableAssets[_getId(_assets[i].content, _assets[i].tokenId)].salvage(_amounts[i]);

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

    function _burnAndMint(LibSalvage.AssetData memory _asset, LibSalvage.SalvageReward[] memory _materials, uint256[] memory _materialAmounts) internal view {

        // 5. burn the asset first
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        burnData.tokenIds = new uint256[](1);
        burnData.amounts = new uint256[](1);
        burnData.tokenIds[0] = _asset.tokenId;
        burnData.amounts[0] = _materialAmounts;
        IContent(_asset.content).burnBatch(burnData);

        // 6. mint the rewards
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        mintData.tokenIds = new uint256[](_materials.length);
        mintData.amounts = new uint256[](_materialAmounts.length);
        for (uint i = 0; i < _materials.length; ++i) {
            mintData.tokenIds[i] = _materials[i].asset.tokenId;
            mintData.amounts[i] = _materialAmounts[i];
        }
        IContent(_asset.content).mintBatch(mintData);
    }

    uint256[50] private __gap;
}