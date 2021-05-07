// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../craft/Craft.sol";

contract TestCraft is Craft {
    using EnumerableSetUpgradeable for *;

    function __TestCraft_init(uint256 _seed) external initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __Craft_init(_seed);
    }
}