// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

// Address Resolver Contract
const AddressResolver = artifacts.require("AddressResolver");

// V2 Exchange Contracts
const Exchange = artifacts.require("Exchange");
const NftEscrow= artifacts.require("NftEscrow");
const Erc20Escrow= artifacts.require("Erc20Escrow");
const ExecutionManager= artifacts.require("ExecutionManager");
const ExchangeFeesEscrow= artifacts.require("ExchangeFeesEscrow");
const RoyaltyManager= artifacts.require("RoyaltyManager");
const Orderbook= artifacts.require("Orderbook");

module.exports = async function(deployer, network, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const resolver = await AddressResolver.deployed()
        
        const nftEscrow = await deployProxy(NftEscrow, [], {deployer, initializer: '__NftEscrow_init'});
        const tokenEscrow = await deployProxy(Erc20Escrow, [], {deployer, initializer: '__Erc20Escrow_init'});
        const feesEscrow = await deployProxy(ExchangeFeesEscrow, [ resolver.address ], {deployer, initializer: '__ExchangeFeesEscrow_init'});
        const orderbook = await deployProxy(Orderbook, [ resolver.address ], {deployer, initializer: '__Orderbook_init'});
        const executionManager = await deployProxy(ExecutionManager, [ resolver.address ], {deployer, initializer: '__ExecutionManager_init'});
        const royaltyManager = await deployProxy(RoyaltyManager, [ resolver.address ], {deployer, initializer: '__RoyaltyManager_init'});

        // register system contracts with the address resolver
        var addresses = [tokenEscrow.address, nftEscrow.address, feesEscrow.address, orderbook.address, executionManager.address, royaltyManager.address];
        var contractHashIds = ["0x29a264aa", "0x87d4498b", "0x7f170836", "0xd9ff7618", "0x018869a9", "0x2c7e992e"];
        await resolver.registerAddress(contractHashIds, addresses);

        // Register the managers
        await nftEscrow.registerManager(executionManager.address);
        await tokenEscrow.registerManager(executionManager.address);
        await tokenEscrow.registerManager(royaltyManager.address);
        await feesEscrow.registerManager(royaltyManager.address);

        // exchange 
        const exchange = await deployProxy(Exchange, [ royaltyManager.address, orderbook.address, executionManager.address ], {deployer, initializer: '__Exchange_init'});

        // transfer ownership of managers to exchange
        await royaltyManager.transferOwnership(exchange.address);
        await orderbook.transferOwnership(exchange.address);
        await executionManager.transferOwnership(exchange.address);

        // Set Rawr token as a supported payment token
        const rawrToken = await RawrToken.deployed()
        await exchange.addSupportedToken(rawrToken.address);
    }
};
