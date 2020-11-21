// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./TokenBase.sol";

contract OVCToken is TokenBase
{
    constructor(uint256 initialSupply) public TokenBase("Omniverse Credits", "OVC", initialSupply)
    {
    }
}