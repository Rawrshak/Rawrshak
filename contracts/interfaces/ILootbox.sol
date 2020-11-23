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

    function registerInputItem(address contractAddress, uint256 id, uint256 amount, uint256 multiplier)
        external;
    function registerInputItemBatch(
        address contractAddress,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        uint256[] calldata multipliers
    ) external;
    function registerReward(address contractAddress, uint256 id, Rarity rarity, uint256 amount)
        external;
    function registerRewardBatch(
        address contractAddress,
        uint256[] calldata ids,
        Rarity[] calldata rarities,
        uint256[] calldata amounts
    ) external;
    function generateLootbox(uint256[] calldata ids, uint256[] calldata amounts) external;
    function openLootbox(uint256 count) external;
    function getRewards(Rarity rarity) external view returns(uint256[] memory hashIds, uint256[] memory rewardCounts);
    function getRequiredInputItemAmount(uint256 hashId) external view returns(uint256);
    function getLootboxId(address contractAddress, uint256 id) external view returns(uint256);
    function getRarity(uint256 hashId) external view returns(Rarity[] memory rarities);
    function setTradeInMinimum(uint8 count) external;
    function getTradeInMinimum() external view returns(uint8);
}