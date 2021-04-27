// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../craft/CraftBase.sol";

contract TestCraftBase is CraftBase {
    using EnumerableSetUpgradeable for *;

    function __TestCraftBase_init(uint256 _seed) external initializer {
        __Pausable_init_unchained();
        __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __CraftBase_init_unchained(_seed);
    }

    function isContentRegistered(address _content) external view returns(bool) {
        return(contentContracts.contains(_content));
    }
}