// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./optimism/L2NativeRawrshakERC20Token.sol";

/// Lootbox Credit is per-developer. These aren't meant to be usable across different projects.
/// For instance, (10000000, "Rawrshak Lootbox Credit", "RAWRLOOT");
contract LootboxCredit is L2NativeRawrshakERC20Token {
    constructor(address _l2Bridge, string memory _name, string memory _symbol, uint256 _initialSupply) L2NativeRawrshakERC20Token(_l2Bridge, _name, _symbol, _initialSupply) {
    }
}