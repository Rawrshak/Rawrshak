// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface ILootboxBase {
    
    /******** Enums ********/
    enum Rarity {
        Common,
        Uncommon,
        Scarce,
        Rare,
        SuperRare,
        Exotic,
        Mythic        
    }

    function setGlobalItemRegistryAddr(address _addr) external;
}