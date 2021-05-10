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
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibCraft.Recipe) recipes;

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

            LibCraft.Recipe storage recipeData = recipes[_recipes[i].id];
            recipeData.id = _recipes[i].id;
            recipeData.enabled = _recipes[i].enabled;
            recipeData.craftingRate = _recipes[i].craftingRate;

            // If recipe already exists, delete it first before updating
            if (recipeData.materials.length > 0) {
                delete recipeData.materials;
                delete recipeData.materialAmounts;
                delete recipeData.rewards;
                delete recipeData.rewardAmounts;
            }

            for (uint256 j = 0; j < _recipes[i].materials.length; ++j) {
                require(contentContracts.contains(_recipes[i].materials[j].content), "Invalid Content Contract permissions");

                recipeData.materials.push(_recipes[i].materials[j]);
                recipeData.materialAmounts.push(_recipes[i].materialAmounts[j]);
            }

            for (uint256 j = 0; j < _recipes[i].rewards.length; ++j) {
                require(contentContracts.contains(_recipes[i].rewards[j].content), "Invalid Content Contract permissions");

                recipeData.rewards.push(_recipes[i].rewards[j]);
                recipeData.rewardAmounts.push(_recipes[i].rewardAmounts[j]);
            }
        }

        emit RecipeUpdated(_recipes);
    }

    function setRecipeEnabled(uint256 _id, bool _enabled) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(exists(_id), "Recipe doesn't exist");
        recipes[_id].enabled = _enabled;

        emit RecipeEnabled(_id, _enabled);
    }

    function setRecipeCraftingRate(uint256 _id, uint256 _craftingRate) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(exists(_id), "Recipe doesn't exist");
        require(_craftingRate > 0 && _craftingRate <= 10000, "Invalid crafting rate.");
        recipes[_id].craftingRate = _craftingRate;
        
        emit RecipeCraftingRateUpdated(_id, _craftingRate);
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
                if (seed.mod(10000) > recipes[_id].craftingRate) {
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

    function recipe(uint256 _id) external view override returns(LibCraft.Recipe memory _recipe) {
        // will return empty if it doesn't exist
        return recipes[_id];
    }

    function exists(uint256 _id) public view override returns(bool) {
        return recipes[_id].id != 0;
    }

    /**************** Internal Functions ****************/
    function _burn(uint256 _id, uint256 _burnAmount) internal {
        LibAsset.BurnData memory burnData;
        burnData.account = _msgSender();
        for (uint i = 0; i < recipes[_id].materials.length; ++i) {
            burnData.tokenIds = new uint256[](1);
            burnData.amounts = new uint256[](1);
            burnData.tokenIds[0] = recipes[_id].materials[i].tokenId;
            burnData.amounts[0] = recipes[_id].materialAmounts[i].mul(_burnAmount);
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
            mintData.amounts[0] = recipes[_id].rewardAmounts[i].mul(_rolls);
            IContent(recipes[_id].rewards[i].content).mintBatch(mintData);
        }
    }

    function _verifyUserAssets(uint256 _id, uint256 _amount) internal view {
        bool noMissingAsset = true;
        uint256 requiredAmount = 0;
        for (uint256 i = 0; i < recipes[_id].materials.length && noMissingAsset; ++i) {
            requiredAmount = recipes[_id].materialAmounts[i].mul(_amount);
            noMissingAsset = IContent(recipes[_id].materials[i].content).balanceOf(_msgSender(), recipes[_id].materials[i].tokenId) > requiredAmount;
        }

        require(noMissingAsset, "Not enough assets");
    }

    uint256[50] private __gap;
}