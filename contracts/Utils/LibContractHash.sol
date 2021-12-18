// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibContractHash {

    /******************** Contract Constants ********************/
    // bytes4(keccak256('CONTRACT_EXCHANGE'))
    bytes4 constant public CONTRACT_EXCHANGE = 0xeef64103;
    bytes4 constant public CONTRACT_ERC20_ESCROW = 0x29a264aa;
    bytes4 constant public CONTRACT_NFT_ESCROW = 0x87d4498b;
    bytes4 constant public CONTRACT_ORDERBOOK = 0xd9ff7618;

    bytes4 constant public CONTRACT_EXECUTION_MANAGER = 0x018869a9;
    bytes4 constant public CONTRACT_ROYALTY_MANAGER = 0x2c7e992e;
    
    bytes4 constant public CONTRACT_CONTENT_FACTORY = 0xdb337f7d;
    bytes4 constant public CONTRACT_STAKING = 0x1b48faca;
    bytes4 constant public CONTRACT_EXCHANGE_FEE_ESCROW = 0x7f170836;

    bytes4 constant public CONTRACT_RAWR_TOKEN = 0x3d13c043;
    
    bytes4 constant public CONTRACT_LIQUIDITY_MINING = 0x385742b9;
    
    bytes4 constant public CONTRACT_DAI_TOKEN = 0x4170d96f;
}