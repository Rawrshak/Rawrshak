// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./StorageBase.sol";
import "./interfaces/ILootbox.sol";
import "./interfaces/ILootboxStorageByItem.sol";
import "../libraries/LibLootbox.sol";
import "hardhat/console.sol";

contract LootboxStorageByItem is ILootboxStorageByItem, AccessControlUpgradeable, ERC165StorageUpgradeable, StorageBase {
    using LibLootbox for *;
    using SafeMathUpgradeable for uint256;

    /******************** Constants ********************/
    
    /***************** Stored Variables *****************/
    // Value for creating unique tokenIds. One will be created with each Lootbox Blueprint sent to the contract.
    uint256 internal tokenId;

    // Mapping of tokenIds to blueprints meta data.
    mapping(uint256 => LibLootbox.Blueprint) lootboxBlueprints;

    // Mapping of tokenIds to all the possible reward items that could be given to the burner.
    mapping(uint256 => LibLootbox.LootboxReward[]) lootboxRewards;
    
    /******************** Public API ********************/
    function initialize() public initializer {
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(type(ILootboxStorageByItem).interfaceId);

        tokenId = 0;
    }

    /******** View Functions ********/
    function getBlueprint(uint256 _tokenId) external view override returns(LibLootbox.Blueprint memory _blueprint) {
        return lootboxBlueprints[_tokenId];
    }

    function getRewards(uint256 _tokenId) external view override returns(LibLootbox.LootboxReward[] memory _rewards) {
        return lootboxRewards[_tokenId];
    }

    function getNumAddedRewards(uint256 _tokenId) external view override returns(uint256) {
        uint256 count = 0;
        for(uint i = 0; i < lootboxRewards[_tokenId].length; i++) {
            if(LibLootbox.isLootboxRewardValid(lootboxRewards[_tokenId][i]))
            {
                count++;
            }
        }
        return count;
    }
    
    function getMaxRewardAssetsGiven(uint256 _tokenId) external view override returns(uint16) {
        return lootboxBlueprints[_tokenId].maxAssetsGiven;
    }

    function exists(uint256 _tokenId) external view override returns(bool) {
        if(lootboxBlueprints[_tokenId].maxAssetsGiven > 0 && lootboxBlueprints[_tokenId].cost > 0 && lootboxRewards[_tokenId].length > 0)
        {
            return true;
        }
        return false;
    }

    function getCost(uint256 _tokenId) external view override returns(uint256) {
        return lootboxBlueprints[_tokenId].cost;
    }

    function getEnabled(uint256 _tokenId) external view override returns(bool) {
        return lootboxBlueprints[_tokenId].enabled;
    }
    
    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable, StorageBase) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    /******** End of View Functions ********/

    /******************** Mutative Functions ********************/
    // Developer only - Add a new lootbox blueprint (i.e. recipe) to the contract.
    function setBlueprint(LibLootbox.Blueprint memory _blueprint) external override checkPermissions(MANAGER_ROLE) {
        LibLootbox.verifyBlueprint(_blueprint);

        tokenId++;
        LibLootbox.Blueprint storage newBlueprint = lootboxBlueprints[tokenId];
        newBlueprint.enabled = _blueprint.enabled;
        newBlueprint.cost = _blueprint.cost;
        newBlueprint.maxAssetsGiven = _blueprint.maxAssetsGiven;
        newBlueprint.hasGuaranteedItems = _blueprint.hasGuaranteedItems;
        emit BlueprintUpdated(_msgSender(), tokenId, newBlueprint);
    }

    function setBlueprintEnabled(uint256 _tokenId, bool _enabled) external override checkPermissions(MANAGER_ROLE) {
        lootboxBlueprints[_tokenId].enabled = _enabled;
        emit BlueprintEnabled(_msgSender(), _tokenId, _enabled);
    }

    function setBlueprintCost(uint256 _tokenId, uint256 _cost) external override checkPermissions(MANAGER_ROLE) {
        require(_cost > 0, "Invalid cost");
        lootboxBlueprints[_tokenId].cost = _cost;
        emit BlueprintCostUpdated(_msgSender(), _tokenId, _cost);
    }

    function setMaxRewardAssetsGiven(uint256 _tokenId, uint16 _maxAssetsGiven) external override checkPermissions(MANAGER_ROLE) {
        require(_maxAssetsGiven > 0, "Assets Given Cannot Be Zero");
        lootboxBlueprints[_tokenId].maxAssetsGiven = _maxAssetsGiven;
        emit BlueprintMaxRewardsUpdated(_msgSender(), _tokenId, _maxAssetsGiven);
    }

    function addLootboxReward(uint256 _tokenId, LibLootbox.LootboxReward memory _reward) external override checkPermissions(MANAGER_ROLE) {
        LibLootbox.verifyLootboxReward(_reward);
        LibLootbox.LootboxReward[] storage rewardArray = lootboxRewards[_tokenId];
        rewardArray.push(_reward);
        lootboxBlueprints[_tokenId].hasGuaranteedItems = LibLootbox.checkForGuaranteedItems(rewardArray);
        emit BlueprintRewardAdded(_msgSender(), _tokenId, _reward);
    }

    function clearLootboxRewards(uint256 _tokenId) external override checkPermissions(MANAGER_ROLE) {
        delete lootboxRewards[_tokenId];
        lootboxBlueprints[_tokenId].hasGuaranteedItems = false;
        emit BlueprintRewardsCleared(_msgSender(), _tokenId);
    }
    /******************** End of Mutative Functions ********************/

    uint256[50] private __gap;
}