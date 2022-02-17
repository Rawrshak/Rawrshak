// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
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
    using SafeMathUpgradeable for uint256;
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

    /**
    * @dev register new asset salvage recipes 
    * @param _assets an array of SalvageableAssets
    */
    function addSalvageableAssetBatch(LibCraft.SalvageableAsset[] memory _assets) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_assets.length > 0, "Error: Invalid input length");

        uint256[] memory ids = new uint256[](_assets.length);
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(_assets[i].asset.content.supportsInterface(type(IContent).interfaceId), "Error: Invalid salvage contract interface");
            require(IContent(_assets[i].asset.content).isSystemContract(address(this)), "Error: Salvage not registered");

            _assets[i].verifySalvageableAsset();
            uint256 id = _assets[i].asset.hashAssetId();

            // This will overwrite whatever is there initially
            salvageableAssets[id].asset = _assets[i].asset;
            salvageableAssets[id].salvageType = _assets[i].salvageType;
            if (salvageableAssets[id].outputs.length > 0) {
                delete salvageableAssets[id].outputs;
            }

            // asset output can be empty
            for (uint256 j = 0; j < _assets[i].outputs.length; ++j) {
                require(_assets[i].outputs[j].asset.content.supportsInterface(type(IContent).interfaceId), "Error: Invalid outputs contract interface");
                require(IContent(_assets[i].outputs[j].asset.content).isSystemContract(address(this)), "Error: Salvage not registered");

                salvageableAssets[id].outputs.push(_assets[i].outputs[j]);
            }
            salvageableAssets[id].lootboxCredits = _assets[i].lootboxCredits;
            ids[i] = id;
        }

        emit SalvageableAssetsUpdated(_msgSender(), _assets, ids);
    }

    /**
    * @dev salvage a single asset (but may salvage more instances of that asset)
    * @param _asset the asset to salvage
    * @param _amount the amount of asset to salvage
    */
    function salvage(LibCraft.AssetData memory _asset, uint256 _amount) public override whenNotPaused() {
        _salvage(_asset, _amount);

        emit AssetSalvaged(_msgSender(), _asset, _amount);
    }
    
    /**
    * @dev salvage an array of assets (and the amount to salvage per asset
    * @param _assets array of assets to salvage
    * @param _amounts array of asset amounts to salvage
    */
    function salvageBatch(LibCraft.AssetData[] memory _assets, uint256[] memory _amounts) external override whenNotPaused() {
        require(_assets.length == _amounts.length && _amounts.length > 0, "Error: Invalid input lengths");

        for (uint256 i = 0; i < _assets.length; ++i) {
            _salvage(_assets[i], _amounts[i]);
        }
        
        emit AssetSalvagedBatch(_msgSender(), _assets, _amounts);
    }

    /**
    * @dev query the list of salvage outputs available (and lootbox credits, if any)
    * @param _asset the asset to query
    */
    function getSalvageOutputs(LibCraft.AssetData calldata _asset) external view override returns(LibCraft.SalvageOutput[] memory outputAssets, LibLootbox.LootboxCreditReward memory outputLootboxCredits) {
        outputAssets = salvageableAssets[_asset.hashAssetId()].outputs;
        outputLootboxCredits = salvageableAssets[_asset.hashAssetId()].lootboxCredits;
    }

    /**************** Internal Functions ****************/

    function _salvage(LibCraft.AssetData memory _asset, uint256 _amount) internal {
        require(_amount > 0, "Error: Invalid amount");

        uint256 id = _asset.hashAssetId();
        
        LibCraft.SalvageOutput[] memory outputAssets;
        uint256[] memory amounts;

        if (LibCraft.SalvageType(salvageableAssets[id].salvageType) == LibCraft.SalvageType.Guarantee) {
            outputAssets = salvageableAssets[id].outputs;
            amounts = new uint256[](salvageableAssets[id].outputs.length);
            for (uint256 i = 0; i < salvageableAssets[id].outputs.length; ++i) {
                amounts[i] = salvageableAssets[id].outputs[i].amount.mul(_amount);
            }
        } else if (LibCraft.SalvageType(salvageableAssets[id].salvageType) == LibCraft.SalvageType.Random) {
            outputAssets = salvageableAssets[id].outputs;
            amounts = new uint256[](salvageableAssets[id].outputs.length);
            
            // Get the number of passing rolls
            for (uint256 i = 0; i < _amount; ++i) {
                for (uint256 j = 0; j < salvageableAssets[id].outputs.length; ++j) {
                    seed = LibCraft.random(_msgSender(), seed);
                    if (seed.mod(1e6) > (1e6 - salvageableAssets[id].outputs[j].probability)) {
                        amounts[j] += salvageableAssets[id].outputs[j].amount;
                    }
                }
            }
        }

        _burn(_asset, _amount);

        // If salvagable assets output is empty, this will not mint anything. It can be empty due to unlucky
        // RNG or if the developer did not set salvage output assets.
        _mint(outputAssets, amounts);
        
        // The developer can choose to only return lootbox credits when an asset is salvaged. They may 
        // also leave this empty.
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
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        burnData.tokenIds = new uint256[](1);
        burnData.amounts = new uint256[](1);
        burnData.tokenIds[0] = _asset.tokenId;
        burnData.amounts[0] = _burnAmount;
        IContent(_asset.content).burnBatch(burnData);
    }

    function _mint(LibCraft.SalvageOutput[] memory _outputAssets, uint256[] memory _materialAmounts) internal {
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