// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./ILootboxBase.sol";

interface ILootbox is ILootboxBase {
    function getLootboxManagerAddress() external view returns(address);

    function generateLootbox(uint256[] calldata _uuids, uint256[] calldata _amounts) external;
    
    function openLootbox(uint256 _count) external;
    
    function getRewards(Rarity _rarity) external view returns(uint256[] memory uuids, uint256[] memory rewardCounts);
    
    function getRequiredInputItemAmount(uint256 _uuid) external view returns(uint256);
    
    function getTradeInMinimum() external view returns(uint8);
}