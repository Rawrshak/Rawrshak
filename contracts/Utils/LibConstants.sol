// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

library LibConstants {

    /******** Shared LibConstants ********/

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
    bytes4 constant _INTERFACE_ID_TOKENBASE = 0x00000004;

    // Content Interfaces
    bytes4 constant _INTERFACE_ID_CONTENT = 0x94b3e03b;
    bytes4 constant _INTERFACE_ID_CONTENT_STORAGE = 0x00000002;
    bytes4 constant _INTERFACE_ID_CONTENT_MANAGER = 0x00000003;
    bytes4 constant _INTERFACE_ID_UNIQUE_CONTENT = 0x00000005;
    bytes4 constant _INTERFACE_ID_SYSTEMS_REGISTRY = 0x00000011;

    // Exchange Interfaces
    bytes4 constant _INTERFACE_ID_ADDRESS_REGISTRY      = 0x00000006;
    bytes4 constant _INTERFACE_ID_ESCROW_NFTS           = 0x00000007;
    bytes4 constant _INTERFACE_ID_ESCROW_ERC20          = 0x00000008;
    bytes4 constant _INTERFACE_ID_ORDERBOOK_STORAGE     = 0x0000000A;
    bytes4 constant _INTERFACE_ID_ORDERBOOK_MANAGER     = 0x0000000B;
    bytes4 constant _INTERFACE_ID_EXECUTION_MANAGER     = 0x0000000C;
    bytes4 constant _INTERFACE_ID_ROYALTY_MANAGER       = 0x0000000D;
    bytes4 constant _INTERFACE_ID_EXCHANGE              = 0x0000000E;
    bytes4 constant _INTERFACE_ID_EXCHANGE_FEE_POOL     = 0x00000012;

    // Salvage Interfaces
    bytes4 constant _INTERFACE_ID_SALVAGE               = 0x0000000F;
    bytes4 constant _INTERFACE_ID_CRAFT                 = 0x00000010;

}