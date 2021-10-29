// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./TokenBase.sol";

/// Lootbox Credit is per-developer. These aren't meant to be usable across different projects.
/// For instance, (10000000, "Rawrshak Lootbox Credit", "RAWRLOOT");
contract LootboxCredit is TokenBase {
    function __LootboxCredit_init(uint256 _initialSupply, string memory _name, string memory _symbol) public initializer {
        __ERC20_init_unchained(_name, _symbol);
        __TokenBase_init_unchained(_initialSupply);
        __ERC165Storage_init_unchained();
        __AccessControl_init_unchained();
    }
    
    uint256[50] private __gap;
}