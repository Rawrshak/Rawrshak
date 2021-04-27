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
import "./interfaces/ISalvage.sol";
import "./CraftBase.sol";
import "../content/interfaces/IContent.sol";
import "../utils/LibConstants.sol";
import "../libraries/LibCraft.sol";

contract Salvage is ISalvage, CraftBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;

    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibCraft.SalvageableAsset) public salvageableAssets;

    /*********************** Events *********************/
    event SalvageableAssetsUpdated(LibCraft.SalvageableAsset[] assets, uint256[] ids);
    event AssetSalvaged(LibCraft.AssetData asset, uint256 amount);
    event AssetSalvagedBatch(LibCraft.AssetData[] assets, uint256[] amounts);
    
    /******************** Public API ********************/
    function __Salvage_init(uint256 _seed) public initializer {
        __CraftBase_init_unchained(_seed);
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_SALVAGE);
    }

    function setSalvageableAssetBatch(LibCraft.SalvageableAsset[] memory _assets) external override whenPaused() checkPermissions(MANAGER_ROLE) {
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

    function salvage(LibCraft.AssetData memory _asset, uint256 _amount) external override whenNotPaused() {
        _validateInput(_asset, _amount);
        
        // 4. call salvage(), which should return the assets to mint
        (LibCraft.SalvageReward[] memory materials, uint256[] memory amounts) = salvageableAssets[_getId(_asset.content, _asset.tokenId)].salvage(_amount);

        _burn(_asset, _amount);

        _mint(materials, amounts);

        emit AssetSalvaged(_asset, _amount);
    }
    

    function salvageBatch(LibCraft.AssetData[] memory _assets, uint256[] memory _amounts) external override whenNotPaused() {
        require(_assets.length == _amounts.length && _amounts.length > 0, "Invalid input lengths.");
        
        for (uint256 i = 0; i < _assets.length; ++i) {
            _validateInput(_assets[i], _amounts[i]);
            
            // 4. call salvage(), which should return the assets to mint
            (LibCraft.SalvageReward[] memory materials, uint256[] memory materialAmounts) = salvageableAssets[_getId(_assets[i].content, _assets[i].tokenId)].salvage(_amounts[i]);

            _burn(_assets[i], _amounts[i]);

            _mint(materials, materialAmounts);
        }
        
        emit AssetSalvagedBatch(_assets, _amounts);
    }

    function getId(LibCraft.AssetData calldata _asset) external pure override returns(uint256) {
        return _getId(_asset.content, _asset.tokenId);
    } 

    /**************** Internal Functions ****************/
    function _getId(address _content, uint256 _tokenId) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_content, _tokenId)));
    }

    function _validateInput(LibCraft.AssetData memory _asset, uint256 _amount) internal view {
        // 1. Check if the asset is salvageable
        require(salvageableAssets[_getId(_asset.content, _asset.tokenId)].rewards.length > 0, "Item not salvageable");
        // 2. Check amount > 0
        require(_amount > 0, "Invalid amount");
        // 3. check if sender has the asset and the amount
        require(IERC1155Upgradeable(_asset.content).balanceOf(_msgSender(), _asset.tokenId) > _amount, "Not enough owned asset");
    }

    function _burn(LibCraft.AssetData memory _asset, uint256 _burnAmount) internal {
        // 5. burn the asset first
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        burnData.tokenIds = new uint256[](1);
        burnData.amounts = new uint256[](1);
        burnData.tokenIds[0] = _asset.tokenId;
        burnData.amounts[0] = _burnAmount;
        IContent(_asset.content).burnBatch(burnData);
    }

    function _mint(LibCraft.SalvageReward[] memory _materials, uint256[] memory _materialAmounts) internal {
        // 6. mint the rewards
        // note: rewards can be from different content contracts. I don't know if we should limit this or not.
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        for (uint i = 0; i < _materials.length; ++i) {
            mintData.tokenIds = new uint256[](1);
            mintData.amounts = new uint256[](1);
            mintData.tokenIds[0] = _materials[i].asset.tokenId;
            mintData.amounts[0] = _materialAmounts[i];
            IContent(_materials[i].asset.content).mintBatch(mintData);
        }
    }

    uint256[50] private __gap;
}