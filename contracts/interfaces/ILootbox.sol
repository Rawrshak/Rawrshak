// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILootbox {
    
    /******** Enums ********/
    enum Rarity {
        Mythic,
        Exotic,
        SuperRare,
        Rare,
        Scarce,
        Uncommon,
        Common
    }

    function registerInputItem(uint256 _uuid, uint256 _amount, uint256 _multiplier)
        external;

    function registerInputItemBatch(
        uint256[] calldata _uuids,
        uint256[] calldata _amounts,
        uint256[] calldata _multipliers
    ) external;

    function registerReward(uint256 _id, Rarity _rarity, uint256 _amount)
        external;

    function registerRewardBatch(
        uint256[] calldata _uuids,
        Rarity[] calldata _rarities,
        uint256[] calldata _amounts
    ) external;

    function generateLootbox(uint256[] calldata _uuids, uint256[] calldata _amounts) external;
    
    function openLootbox(uint256 _count) external;
    
    function getRewards(Rarity _rarity) external view returns(uint256[] memory uuids, uint256[] memory rewardCounts);
    
    function getRequiredInputItemAmount(uint256 _uuid) external view returns(uint256);
    
    function getRarity(uint256 _uuid) external view returns(Rarity[] memory rarities);
    
    function setTradeInMinimum(uint8 _count) external;
    
    function getTradeInMinimum() external view returns(uint8);
}