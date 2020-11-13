// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./OVCTokenBase.sol";

contract OVCToken is OVCTokenBase
{
    constructor(uint256 initialSupply) public OVCTokenBase("Omniverse Credits", "OVC", initialSupply)
    {
    }
}