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


    // Exchange Interfaces
    bytes4 constant INTERFACE_ID_ADDRESS_REGISTRY      = 0x00000006;
    bytes4 constant INTERFACE_ID_NFT_ESCROW            = 0x00000007;
    bytes4 constant INTERFACE_ID_ERC20_ESCROW          = 0x00000008;
    bytes4 constant INTERFACE_ID_ORDERBOOK             = 0x0000000B;
    bytes4 constant INTERFACE_ID_EXECUTION_MANAGER     = 0x0000000C;
    bytes4 constant INTERFACE_ID_ROYALTY_MANAGER       = 0x0000000D;
    bytes4 constant INTERFACE_ID_EXCHANGE              = 0x0000000E;
    bytes4 constant INTERFACE_ID_EXCHANGE_FEES_ESCROW  = 0x00000012;

    // Staking Interfaces
    bytes4 constant INTERFACE_ID_STAKING               = 0x00000016;

}