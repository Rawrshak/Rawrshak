// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@rawrshak/rawr-token/contracts/optimism/IL2StandardERC20Latest.sol";
import "./interfaces/ISalvage.sol";
import "./CraftBase.sol";
import "../content/interfaces/IContent.sol";
import "../libraries/LibCraft.sol";
import "../libraries/LibLootbox.sol";
import "hardhat/console.sol";

contract Salvage is ISalvage, CraftBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;

    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibCraft.SalvageableAsset) internal salvageableAssets;
    
    /******************** Public API ********************/
    function initialize(uint256 _seed) public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
        _registerInterface(type(ISalvage).interfaceId);
    }

    function addSalvageableAssetBatch(LibCraft.SalvageableAsset[] memory _assets) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_assets.length > 0, "Error: Invalid input length");

        uint256[] memory ids = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(_assets[i].asset.content.supportsInterface(type(IContent).interfaceId), "Error: Invalid salvage contract interface");

            _assets[i].verifySalvageableAsset();
            uint256 id = _assets[i].asset.hashAssetId();

            // This will overwrite whatever is there initially
            salvageableAssets[id].asset = _assets[i].asset;
            salvageableAssets[id].salvageType = _assets[i].salvageType;
            if (salvageableAssets[id].outputs.length > 0) {
                delete salvageableAssets[id].outputs;
            }

            for (uint256 j = 0; j < _assets[i].outputs.length; ++j) {
                require(_assets[i].outputs[j].asset.content.supportsInterface(type(IContent).interfaceId), "Error: Invalid outputs contract interface");

                salvageableAssets[id].outputs.push(_assets[i].outputs[j]);
            }
            salvageableAssets[id].lootboxCredits = _assets[i].lootboxCredits;
            ids[i] = id;
        }

        emit SalvageableAssetsUpdated(_msgSender(), _assets, ids);
    }

    function salvage(LibCraft.AssetData memory _asset, uint256 _amount) public override whenNotPaused() {
        _salvage(_asset, _amount);

        emit AssetSalvaged(_msgSender(), _asset, _amount);
    }
    

    function salvageBatch(LibCraft.AssetData[] memory _assets, uint256[] memory _amounts) external override whenNotPaused() {
        require(_assets.length == _amounts.length && _amounts.length > 0, "Error: Invalid input lengths");

        for (uint256 i = 0; i < _assets.length; ++i) {
            _salvage(_assets[i], _amounts[i]);
        }
        
        emit AssetSalvagedBatch(_msgSender(), _assets, _amounts);
    }

    function getSalvageOutputs(LibCraft.AssetData calldata _asset) external view override returns(LibCraft.SalvageOutput[] memory outputAssets, LibLootbox.LootboxCreditReward memory outputLootboxCredits) {
        outputAssets = salvageableAssets[_asset.hashAssetId()].outputs;
        outputLootboxCredits = salvageableAssets[_asset.hashAssetId()].lootboxCredits;
    }

    /**************** Internal Functions ****************/

    function _salvage(LibCraft.AssetData memory _asset, uint256 _amount) internal {
        require(salvageableAssets[_asset.hashAssetId()].outputs.length > 0, "Error: Item not salvageable");
        require(_amount > 0, "Error: Invalid amount");

        uint256 id = _asset.hashAssetId();
        
        // 4. call salvage(), which should return the assets to mint
        (LibCraft.SalvageOutput[] memory outputAssets, uint256[] memory amounts) = salvageableAssets[id].salvage(_amount);

        _burn(_asset, _amount);

        _mint(outputAssets, amounts);
        
        if(salvageableAssets[id].lootboxCredits.tokenAddress != address(0))
        {
            // Note: The Salvage Contract mus have the MINTER_ROLE in the lootbox credit contract
            LibLootbox.verifyLootboxCreditReward(salvageableAssets[id].lootboxCredits);
            uint256 lootCredit = LibLootbox.salvageCredit(salvageableAssets[id].lootboxCredits, seed);
            IL2StandardERC20Latest(salvageableAssets[id].lootboxCredits.tokenAddress).mint(_msgSender(), lootCredit);
            emit LootboxCreditEarned(_msgSender(), salvageableAssets[id].lootboxCredits.tokenAddress, lootCredit);
        }
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

    function _mint(LibCraft.SalvageOutput[] memory _outputAssets, uint256[] memory _materialAmounts) internal {
        // 6. mint the rewards
        // note: rewards can be from different content contracts. I don't know if we should limit this or not.
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        for (uint i = 0; i < _outputAssets.length; ++i) {
            mintData.tokenIds = new uint256[](1);
            mintData.amounts = new uint256[](1);
            mintData.tokenIds[0] = _outputAssets[i].asset.tokenId;
            mintData.amounts[0] = _materialAmounts[i];
            IContent(_outputAssets[i].asset.content).mintBatch(mintData);
        }
    }

    uint256[50] private __gap;
}