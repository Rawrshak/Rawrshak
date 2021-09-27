// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenBase.sol";

contract RawrToken is TokenBase {
    function initialize(uint256 _initialSupply) public initializer {
        __ERC20_init_unchained("Rawrshak Token", "RAWR");
        __TokenBase_init_unchained(_initialSupply);
        __ERC165Storage_init_unchained();
        __AccessControl_init_unchained();
    }
    
    uint256[50] private __gap;
}