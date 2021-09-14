// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../craft/Craft.sol";

contract TestCraft is Craft {
    using EnumerableSetUpgradeable for *;

    function __TestCraft_init(uint256 _seed) external initializer {
        __Craft_init(_seed);
    }
}