// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./TokenBase.sol";

contract RawrToken is TokenBase
{
    constructor(uint256 _initialSupply) public TokenBase("Rawrshak Token", "RAWR", _initialSupply)
    {
    }
}