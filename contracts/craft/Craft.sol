// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ICraft.sol";
import "./CraftBase.sol";
import "../content/interfaces/IContent.sol";
import "../utils/LibConstants.sol";
import "../libraries/LibCraft.sol";

contract Craft is ICraft, CraftBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibCraft.Recipe) recipes;
    
    /*********************** Events *********************/
    event RecipeUpdated(LibCraft.Recipe[] _recipes);
    event AssetsCrafted(uint256 _id, uint256 _amountSucceeded);

    /******************** Public API ********************/
    function __Craft_init(uint256 _seed) public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
        _registerInterface(LibConstants._INTERFACE_ID_CRAFT);
    }

    function setRecipeBatch(LibCraft.Recipe[] memory _recipes) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_recipes.length > 0, "Invalid input length.");
 
        for (uint256 i = 0; i < _recipes.length; ++i) {
            require(_recipes[i].materials.length > 0 && _recipes[i].materials.length == _recipes[i].materialAmounts.length, "Invalid materials length");
            require(_recipes[i].rewards.length > 0 && _recipes[i].rewards.length == _recipes[i].rewardAmounts.length, "Invalid rewards length");
            require(_recipes[i].id != 0, "Invalid id");
            require(_recipes[i].craftingRate > 0 && _recipes[i].craftingRate <= 10000, "Invalid crafting rate.");

            LibCraft.Recipe storage recipe = recipes[_recipes[i].id];
            recipe.id = _recipes[i].id;
            recipe.enabled = _recipes[i].enabled;
            recipe.craftingRate = _recipes[i].craftingRate;

            // If recipe already exists, delete it first before updating
            if (recipe.materials.length > 0) {
                delete recipe.materials;
                delete recipe.materialAmounts;
                delete recipe.rewards;
                delete recipe.rewardAmounts;
            }

            for (uint256 j = 0; j < _recipes[i].materials.length; ++j) {
                require(contentContracts.contains(_recipes[i].materials[j].content), "Invalid Content Contract permissions");

                recipe.materials.push(_recipes[i].materials[j]);
                recipe.materialAmounts.push(_recipes[i].materialAmounts[j]);
            }

            for (uint256 j = 0; j < _recipes[i].rewards.length; ++j) {
                require(contentContracts.contains(_recipes[i].rewards[j].content), "Invalid Content Contract permissions");

                recipe.rewards.push(_recipes[i].rewards[j]);
                recipe.rewardAmounts.push(_recipes[i].rewardAmounts[j]);
            }
        }

        emit RecipeUpdated(_recipes);
    }

    function setRecipeEnabled(uint256 _id, bool _enabled) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(exists(_id), "Recipe doesn't exist");
        recipes[_id].enabled = _enabled;
    }

    function setRecipeCraftingRate(uint256 _id, uint256 _craftingRate) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(exists(_id), "Recipe doesn't exist");
        require(_craftingRate > 0 && _craftingRate <= 10000, "Invalid crafting rate.");
        recipes[_id].craftingRate = _craftingRate;
    }

    function craft(uint256 _id, uint256 _amount) external override whenNotPaused() {
        require(exists(_id) && _amount > 0, "Invalid input");
        
        // Verify user has all the materials
        _verifyUserAssets(_id, _amount);

        _burn(_id, _amount);
        
        // check crafting rate if it's less than 100%, then get a random number
        
        if (recipes[_id].craftingRate < 10000) {
            for (uint256 i = 0; i < _amount; ++i) {
                seed = LibCraft.random(_msgSender(), seed);
                if (SafeMathUpgradeable.mod(seed, 10000) > recipes[_id].craftingRate) {
                    // if crafting fails, deduct the number of rolls that failed
                    --_amount;
                }
            }
        }

        if (_amount > 0) {
            _mint(_id, _amount);
        }
        
        emit AssetsCrafted(_id, _amount);
    }

    function getRecipe(uint256 _id) external view override returns(LibCraft.Recipe memory _recipe) {
        // will return empty if it doesn't exist
        return recipes[_id];
    }

    function exists(uint256 _id) public view override returns(bool) {
        return recipes[_id].id != 0;
    }

    function _burn(uint256 _id, uint256 _burnAmount) internal {
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        for (uint i = 0; i < recipes[_id].materials.length; ++i) {
            burnData.tokenIds = new uint256[](1);
            burnData.amounts = new uint256[](1);
            burnData.tokenIds[0] = recipes[_id].materials[i].tokenId;
            burnData.amounts[0] = SafeMathUpgradeable.mul(recipes[_id].materialAmounts[i], _burnAmount);
            IContent(recipes[_id].materials[i].content).burnBatch(burnData);
        }
    }

    function _mint(uint256 _id, uint256 _rolls) internal {
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        for (uint i = 0; i < recipes[_id].rewards.length; ++i) {
            mintData.tokenIds = new uint256[](1);
            mintData.amounts = new uint256[](1);
            mintData.tokenIds[0] = recipes[_id].rewards[i].tokenId;
            mintData.amounts[0] = SafeMathUpgradeable.mul(recipes[_id].rewardAmounts[i], _rolls);
            IContent(recipes[_id].rewards[i].content).mintBatch(mintData);
        }
    }

    function _verifyUserAssets(uint256 _id, uint256 _amount) internal view {
        bool noMissingAsset = true;
        uint256 requiredAmount = 0;
        for (uint256 i = 0; i < recipes[_id].materials.length && noMissingAsset; ++i) {
            requiredAmount = SafeMathUpgradeable.mul(recipes[_id].materialAmounts[i], _amount);
            noMissingAsset = IContent(recipes[_id].materials[i].content).balanceOf(_msgSender(), recipes[_id].materials[i].tokenId) > requiredAmount;
        }

        require(noMissingAsset, "Not enough assets");
    }

    uint256[50] private __gap;
}