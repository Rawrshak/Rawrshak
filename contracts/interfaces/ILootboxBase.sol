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

    function setGlobalItemRegistryAddr(address _addr) external;
}