// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../craft/CraftBase.sol";

contract TestCraftBase is CraftBase {
    using EnumerableSetUpgradeable for *;
    
    function initialize(uint256 _seed) external initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
    }
}