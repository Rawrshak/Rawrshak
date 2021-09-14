// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
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
    uint256 public override recipesLength = 0;

    /******************** Public API ********************/
    function __Craft_init(uint256 _seed) public initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
        _registerInterface(LibConstants._INTERFACE_ID_CRAFT);
    }

    function addRecipeBatch(LibCraft.Recipe[] memory _recipes) external override whenPaused() onlyRole(MANAGER_ROLE) {
        require(_recipes.length > 0, "Invalid input length.");

        uint256[] memory ids = new uint256[](_recipes.length);

        for (uint256 i = 0; i < _recipes.length; ++i) {
            require(_recipes[i].materials.length > 0 && _recipes[i].materials.length == _recipes[i].materialAmounts.length, "Invalid materials length");
            require(_recipes[i].rewards.length > 0 && _recipes[i].rewards.length == _recipes[i].rewardAmounts.length, "Invalid rewards length");
            require(_recipes[i].craftingRate > 0 && _recipes[i].craftingRate <= 1 ether, "Invalid crafting rate.");

            LibCraft.Recipe storage recipeData = recipes[recipesLength];
            ids[i] = recipesLength;
            recipeData.enabled = _recipes[i].enabled;
            recipeData.craftingRate = _recipes[i].craftingRate;

            for (uint256 j = 0; j < _recipes[i].materials.length; ++j) {
                // Todo: Should we assume that these are content/ERC1155 contracts by default? Can we move
                //       this check to the UI side?
                require(_recipes[i].materials[j].content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Contract is not a Content Contract");

                recipeData.materials.push(_recipes[i].materials[j]);
                recipeData.materialAmounts.push(_recipes[i].materialAmounts[j]);
            }

            for (uint256 j = 0; j < _recipes[i].rewards.length; ++j) {
                // Todo: Should we assume that these are content/ERC1155 contracts by default? Can we move
                //       this check to the UI side?
                require(_recipes[i].rewards[j].content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Contract is not a Content Contract");

                recipeData.rewards.push(_recipes[i].rewards[j]);
                recipeData.rewardAmounts.push(_recipes[i].rewardAmounts[j]);
            }

            recipesLength++;
        }

        emit RecipeUpdated(_msgSender(), ids, _recipes);
    }

    function enableRecipe(uint256 _id, bool _enabled) external override whenPaused() onlyRole(MANAGER_ROLE) {
        require(_id < recipesLength, "Recipe doesn't exist");
        recipes[_id].enabled = _enabled;

        emit RecipeEnabled(_msgSender(), _id, _enabled);
    }

    function craft(uint256 _id, uint256 _amount) external override whenNotPaused() {
        require(_id < recipesLength && _amount > 0, "Invalid input");
        require(recipes[_id].enabled, "Recipe disabled");
        
        // User should call setApprovalForAll() with the craft contract as the operator before calling craft()
        _burn(_id, _amount);
        
        // check crafting rate if it's less than 100%, then get a random number
        if (recipes[_id].craftingRate < 1 ether) {
            for (uint256 i = 0; i < _amount; ++i) {
                seed = LibCraft.random(_msgSender(), seed);
                if ((seed % 1 ether) > recipes[_id].craftingRate) {
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
            burnData.amounts[0] = recipes[_id].materialAmounts[i] * _burnAmount;
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
            mintData.amounts[0] = recipes[_id].rewardAmounts[i] * _rolls;
            IContent(recipes[_id].rewards[i].content).mintBatch(mintData);
        }
    }

    uint256[50] private __gap;
}