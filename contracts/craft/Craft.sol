// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

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
import "../libraries/LibCraft.sol";

contract Craft is ICraft, CraftBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibCraft.Recipe) recipes;
    uint256 recipeCounter;

    /******************** Public API ********************/
    function initialize(uint256 _seed) public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
        _registerInterface(type(ICraft).interfaceId);

        recipeCounter = 0;
    }

    /**
    * @dev register a list of new crafting recipes; Recipes cannot be updated, only disabled/enabled
    * @param _recipes an array of Craft Recipes
    */
    function addRecipeBatch(LibCraft.Recipe[] memory _recipes) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_recipes.length > 0, "Invalid input length");

        uint256[] memory ids = new uint256[](_recipes.length);

        // Note: This allows for materials and rewards from different contracts, but this contract must be registered
        // as a system contract on the content contract
        for (uint256 i = 0; i < _recipes.length; ++i) {
            require(_recipes[i].materials.length > 0 && _recipes[i].materials.length == _recipes[i].materialAmounts.length, "Invalid materials length");
            require(_recipes[i].rewards.length > 0 && _recipes[i].rewards.length == _recipes[i].rewardAmounts.length, "Invalid rewards length");
            require(_recipes[i].craftingRate > 0 && _recipes[i].craftingRate <= 1e6, "Error: Invalid crafting rate");

            LibCraft.Recipe storage recipeData = recipes[recipeCounter];
            ids[i] = recipeCounter;
            recipeData.enabled = _recipes[i].enabled;
            recipeData.craftingRate = _recipes[i].craftingRate;

            for (uint256 j = 0; j < _recipes[i].materials.length; ++j) {
                require(_recipes[i].materials[j].content.supportsInterface(type(IContent).interfaceId), "Error: Invalid materials contract interface");
                require(IContent(_recipes[i].materials[j].content).isSystemContract(address(this)), "Error: Craft not registered");
                require(_recipes[i].materialAmounts[j] > 0, "Error: Invalid amounts");

                recipeData.materials.push(_recipes[i].materials[j]);
                recipeData.materialAmounts.push(_recipes[i].materialAmounts[j]);
            }

            for (uint256 j = 0; j < _recipes[i].rewards.length; ++j) {
                require(_recipes[i].rewards[j].content.supportsInterface(type(IContent).interfaceId), "Error: Invalid reward contract interface");
                require(IContent(_recipes[i].rewards[j].content).isSystemContract(address(this)), "Error: Craft not registered");
                require(_recipes[i].rewardAmounts[j] > 0, "Error: Invalid amounts");

                recipeData.rewards.push(_recipes[i].rewards[j]);
                recipeData.rewardAmounts.push(_recipes[i].rewardAmounts[j]);
            }

            recipeCounter++;
        }

        emit RecipeAdded(_msgSender(), ids, _recipes);
    }

    /**
    * @dev enable or disable a craft recipe
    * @param _id the ID of the craft recipe to be enabled/disabled
    * @param _enabled whether to enable/disable a recipe
    */
    function setRecipeEnabled(uint256 _id, bool _enabled) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_id < recipeCounter, "Error: Recipe doesn't exist");
        recipes[_id].enabled = _enabled;

        emit RecipeEnabled(_msgSender(), _id, _enabled);
    }

    /**
    * @dev craft a new asset
    * @param _id the ID of the craft recipe to be crafted
    * @param _amount the amount of instances of the new asset to craft
    */
    function craft(uint256 _id, uint256 _amount) external override whenNotPaused() {
        require(_id < recipeCounter && _amount > 0, "Error: Invalid input");
        require(recipes[_id].enabled, "Error: Recipe disabled");
        
        // User should call setApprovalForAll() with the craft contract as the operator before calling craft()
        _burn(_id, _amount);
        
        // check crafting rate if it's less than 100%, then get a random number
        if (recipes[_id].craftingRate < 1e6) {
            for (uint256 i = 0; i < _amount; ++i) {
                seed = LibCraft.random(_msgSender(), seed);
                if (seed.mod(1e6) > recipes[_id].craftingRate) {
                    // if crafting fails, deduct the number of rolls that failed
                    --_amount;
                }
            }
        }

        if (_amount > 0) {
            _mint(_id, _amount);
        }
        
        emit AssetsCrafted(_msgSender(), _id, _amount);
    }

    /**
    * @dev Get the craft recipe information
    * @param _id the ID of the craft recipe to query
    */
    function recipe(uint256 _id) external view override returns(LibCraft.Recipe memory _recipe) {
        // will return empty if it doesn't exist
        return recipes[_id];
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
    
    function _mint(uint256 _id, uint256 _amount) internal {
        LibAsset.MintData memory mintData;
        mintData.to = _msgSender();
        for (uint i = 0; i < recipes[_id].rewards.length; ++i) {
            mintData.tokenIds = new uint256[](1);
            mintData.amounts = new uint256[](1);
            mintData.tokenIds[0] = recipes[_id].rewards[i].tokenId;
            mintData.amounts[0] = recipes[_id].rewardAmounts[i].mul(_amount);
            IContent(recipes[_id].rewards[i].content).mintBatch(mintData);
        }
    }

    uint256[50] private __gap;
}