// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IGlobalItemRegistry.sol";

contract GlobalItemRegistry is AccessControl {

    /******** Data Structures ********/
    struct Item {
        address gameAddress;
        uint256 gameId;
    }
    
    /******** Stored Variables ********/
    mapping(uint256 => Item) itemRegistry;

    // Todo: Implement IGlobalItemRegistry
}