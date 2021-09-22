// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

// Address Resolver Contract
const AddressResolver = artifacts.require("AddressResolver");

// Mock Tokens
const MockToken = artifacts.require("MockToken");

// Liquidity Mining Contracts
const LiquidityMining = artifacts.require("LiquidityMining");

module.exports = async function(deployer, network, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const rawr = await RawrToken.deployed()

        // Deploy Mock contracts
        const usdcMock  = await deployProxy(MockToken, [ "USDC", "USDC" ], {deployer, initializer: 'initialize'});
        const usdtMock  = await deployProxy(MockToken, [ "USDT", "USDT"], {deployer, initializer: 'initialize'});
        const daiMock  = await deployProxy(MockToken, [ "DAI", "DAI"], {deployer, initializer: 'initialize'});

        const liquidityMining = await deployProxy(LiquidityMining, [ usdcMock.address, usdtMock.address, daiMock.address, rawr.address ], {deployer, initializer: '__LiquidityMining_init'});

        
        // Register Liquidity Minter in the resolver 
        const resolver = await AddressResolver.deployed()
        await resolver.registerAddress(["0x385742b9"], [liquidityMining.address]);
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};