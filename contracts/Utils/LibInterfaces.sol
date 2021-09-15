// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibInterfaces {

    /******** Shared LibInterfaces ********/

    /* TODO: The Interface ID should be a hash that is going to be a XOR of the bytes4(keccak256('function(parameters))) for the actual interface. 
    But the interfaces aren't finalized yet so we can just keep them as they are now.

    Use https://emn178.github.io/online-tools/keccak_256.html and https://toolslick.com/math/bitwise/xor-calculator for manual hash calculations.

    Like so:
    TokenBase
    /*
    * bytes4(keccak256('mint(address,uint256)')) == 0x40c10f19
    * bytes4(keccak256('burn(address,uint256)')) == 0x9dc29fac
    *
    * => 0x40c10f19 ^ 0x9dc29fac == 0xdd0390b5
    */

    // Token Interface 
    bytes4 constant INTERFACE_ID_TOKENBASE = 0x00000004;

    // Content Interfaces
    bytes4 constant INTERFACE_ID_CONTENT = 0x98AA21F4; // 0x94b3e03b;
    bytes4 constant INTERFACE_ID_CONTENT_STORAGE = 0xA133AF9C; // 0x00000002;
    bytes4 constant INTERFACE_ID_CONTENT_MANAGER = 0xEAD82167; // 0x00000003;
    bytes4 constant INTERFACE_ID_ACCESS_CONTROL_MANAGER = 0xDC54FD6E; // Prev: 0x00000011;
    bytes4 constant INTERFACE_ID_CONTENT_SUBSYSTEM_BASE = 0xFC6A7FB2; // 0x00000018;

    // Exchange Interfaces
    bytes4 constant INTERFACE_ID_ADDRESS_REGISTRY      = 0x00000006;
    bytes4 constant INTERFACE_ID_ESCROW_NFTS           = 0x00000007;
    bytes4 constant INTERFACE_ID_ESCROW_ERC20          = 0x00000008;
    bytes4 constant INTERFACE_ID_ORDERBOOK             = 0x0000000B;
    bytes4 constant INTERFACE_ID_EXECUTION_MANAGER     = 0x0000000C;
    bytes4 constant INTERFACE_ID_ROYALTY_MANAGER       = 0x0000000D;
    bytes4 constant INTERFACE_ID_EXCHANGE              = 0x0000000E;
    bytes4 constant INTERFACE_ID_EXCHANGE_FEE_POOL     = 0x00000012;

    // Staking Interfaces
    bytes4 constant INTERFACE_ID_CLAIMABLE             = 0x00000013;
    bytes4 constant INTERFACE_ID_REWARDS_MANAGER       = 0x00000014;
    bytes4 constant INTERFACE_ID_FUND_POOL             = 0x00000015;
    bytes4 constant INTERFACE_ID_STAKING               = 0x00000016;
    bytes4 constant INTERFACE_ID_LOCKED_FUND           = 0x00000017;
}