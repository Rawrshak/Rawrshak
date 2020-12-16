// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./ILootboxBase.sol";

interface ILootboxManager is ILootboxBase {
    /******** View Functions ********/
    function getLootboxAddress(uint256 _lootboxId) external view returns(address);
    
    /******** Mutative Functions ********/
    function generateLootboxContract(address _lootboxFactoryAddress, string calldata _url) external;
    
    function registerInputItemBatch(
        uint256 _lootboxId,
        uint256[] calldata _uuids,
        uint256[] calldata _amounts,
        uint256[] calldata _multipliers
    ) external;

    function registerRewardBatch(
        uint256 _lootboxId,
        uint256[] calldata _uuids,
        Rarity[] calldata _rarities,
        uint256[] calldata _amounts
    ) external;
    
    function setTradeInMinimum(uint256 _lootboxId, uint8 _count) external;
}