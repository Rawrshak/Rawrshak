// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILootboxBase {
    
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
    
    function setTradeInMinimum(uint8 _count) external;
}