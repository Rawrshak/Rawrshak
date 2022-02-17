// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibLootbox.sol";

interface ILootboxStorageByItem {
    /******** View Functions ********/
    function getBlueprint(uint256 _tokenId) external view returns(LibLootbox.Blueprint memory _blueprint);

    function getRewards(uint256 _tokenId) external view returns(LibLootbox.LootboxReward[] memory _rewards);

    function getNumAddedRewards(uint256 _tokenId) external view returns(uint256);

    function getMaxRewardAssetsGiven(uint256 _tokenId) external view returns(uint16);
    
    function exists(uint256 _tokenId) external view returns(bool);

    function getCost(uint256 _tokenId) external view returns(uint256);

    function getEnabled(uint256 _tokenId) external view returns(bool);

    /******** Mutative Functions ********/
    function setBlueprint(LibLootbox.Blueprint memory _blueprint) external;

    function setBlueprintEnabled(uint256 _tokenId, bool _enabled) external;

    function setBlueprintCost(uint256 _tokenId, uint256 _cost) external;

    function setMaxRewardAssetsGiven(uint256 _tokenId, uint16 _maxAssetsGiven) external;

    function addLootboxReward(uint256 _tokenId, LibLootbox.LootboxReward memory _reward) external;

    function clearLootboxRewards(uint256 _tokenId) external;
    
    /*********************** Events *********************/
    event BlueprintUpdated(address indexed operator, uint256 indexed tokenId, LibLootbox.Blueprint blueprint);
    event BlueprintEnabled(address indexed operator, uint256 indexed tokenId, bool enabled);
    event BlueprintCostUpdated(address indexed operator, uint256 indexed tokenId, uint256 cost);
    event BlueprintMaxRewardsUpdated(address indexed operator, uint256 indexed tokenId, uint16 maxRewards);
    event BlueprintRewardAdded(address indexed operator, uint256 indexed tokenId, LibLootbox.LootboxReward reward);
    event BlueprintRewardsCleared(address indexed operator, uint256 indexed tokenId);
}