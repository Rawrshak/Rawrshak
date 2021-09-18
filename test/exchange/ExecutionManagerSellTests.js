const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const ContentFactory = artifacts.require("ContentFactory");
const AccessControlManager = artifacts.require("AccessControlManager");
const Erc20Escrow = artifacts.require("Erc20Escrow");
const NftEscrow = artifacts.require("NftEscrow");
const Orderbook = artifacts.require("Orderbook");
const ExecutionManager = artifacts.require("ExecutionManager");
const AddressResolver = artifacts.require("AddressResolver");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');
const { deploy } = require('@openzeppelin/truffle-upgrades/dist/utils');

contract('Execution Manager Contract Sell Tests', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        creator1Address,            // content nft Address
        creator2Address,            // creator Address
        playerAddress,              // player 1 address
        player2Address,             // player 2 address
        invalidTokenAddress         // Fake token address 
    ] = accounts;

    // NFT
    var contentFactory;
    var content;
    var contentManager;

    // Rawr Token 
    var rawrToken;

    // Address Resolver
    var resolver;

    var tokenEscrow;
    var nftEscrow;
    var orderbook;
    var executionManager;

    before(async () => {
        var originalAccessControlManager = await AccessControlManager.new();
        var originalContent = await Content.new();
        var originalContentStorage = await ContentStorage.new();
        var originalContentManager = await ContentManager.new();
        contentFactory = await ContentFactory.new();
    
        // Initialize Clone Factory
        await contentFactory.__ContentFactory_init(
            originalContent.address,
            originalContentManager.address,
            originalContentStorage.address,
            originalAccessControlManager.address);
            
        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});
    });

    async function ContentContractSetup() {
        var result = await contentFactory.createContracts(
            [[creator1Address, 20000], [creator2Address, 10000]],
            "arweave.net/tx-contract-uri");
        
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);
            
        // Add 2 assets
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, 20000]]],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
        ];
        await contentManager.addAssetBatch(asset);
        
        // Mint an asset
        var mintData = [playerAddress, [1], [10], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        
        mintData = [player2Address, [2], [5], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    }

    async function ExchangeSetup() {
        // Setup Content Escrow
        nftEscrow = await NftEscrow.new();
        await nftEscrow.__NftEscrow_init({from: deployerAddress});
        
        tokenEscrow = await Erc20Escrow.new();
        await tokenEscrow.__Erc20Escrow_init({from: deployerAddress});

        // Setup Orderbook Storage
        orderbook = await Orderbook.new();
        await orderbook.__Orderbook_init(resolver.address, {from: deployerAddress});

        // register the royalty manager
        var addresses = [tokenEscrow.address, nftEscrow.address, orderbook.address];
        var escrowIds = ["0x29a264aa", "0x87d4498b", "0xd9ff7618"];
        await resolver.registerAddress(escrowIds, addresses, {from: deployerAddress});

        executionManager = await ExecutionManager.new();
        await executionManager.__ExecutionManager_init(resolver.address, {from: deployerAddress});
        
        // Register the execution manager
        await nftEscrow.registerManager(executionManager.address, {from:deployerAddress});
        await tokenEscrow.registerManager(executionManager.address, {from:deployerAddress});

        // exchange.addToken
        await executionManager.addSupportedToken(rawrToken.address, {from:deployerAddress});
    }

    beforeEach(async () => {
        executionManager = await ExecutionManager.new();
        await executionManager.__ExecutionManager_init(resolver.address, {from: deployerAddress});
    });

    it('Place Sell Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        await content.setApprovalForAll(nftEscrow.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});
        
        assert.equal(
            await nftEscrow.escrowedAmounts(1),
            2,
            "Tokens were not escrowed."
        )
    });

    it('Execute Sell Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        await content.setApprovalForAll(nftEscrow.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];

        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('1000', 'ether'), {from:player2Address});
        await executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrToken.address, {from:deployerAddress});

        assert.equal(
            await tokenEscrow.escrowedTokensByOrder(1),
            web3.utils.toWei('1000', 'ether').toString(),
            "Tokens were not sent to escrow."
        )
    });

    it('Invalid Execute Sell Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        await content.setApprovalForAll(nftEscrow.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [1, 2];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 1];

        // orders and payment order length doesn't match
        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('1000', 'ether'), {from:player2Address});
        await TruffleAssert.fails(
            executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrToken.address, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Delete Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        var sellOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            2,
            false
        ];

        var id = await orderbook.ordersLength();
        await orderbook.placeOrder(sellOrderData, {from: deployerAddress});
        await content.setApprovalForAll(nftEscrow.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(id, playerAddress, [content.address, 1], 2, {from: deployerAddress});
        await executionManager.cancelOrders([id], {from: deployerAddress});

        assert.equal(
            await nftEscrow.escrowedAmounts(id),
            0,
            "Assets are still escrowed."
        );
        
        var buyOrderData = [ 
            [content.address, 2],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];

        id = await orderbook.ordersLength();
        await orderbook.placeOrder(buyOrderData, {from: deployerAddress});
        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(id, rawrToken.address, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});
        
        await executionManager.cancelOrders([id], {from: deployerAddress});

        assert.equal(
            await tokenEscrow.escrowedTokensByOrder(id),
            0,
            "Tokens are still escrowed."
        )
    });

    it('Claim Tokens from Filled Sell Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        // Create and fill a sell order
        var sellOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            2,
            false
        ];

        var id = await orderbook.ordersLength();
        await orderbook.placeOrder(sellOrderData, {from: deployerAddress});
        await content.setApprovalForAll(nftEscrow.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(id, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [id];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [2];

        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:player2Address});
        await executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrToken.address, {from:deployerAddress});

        await executionManager.claimOrders(playerAddress, orders, {from:deployerAddress});

        assert.equal(
            await tokenEscrow.escrowedTokensByOrder(1),
            0,
            "Tokens are still escrowed."
        )
    });

    it('Verify Token is supported', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();

        assert.equal(
            await executionManager.verifyToken(rawrToken.address),
            true,
            "Token should be supported.");
            
        assert.equal(
            await executionManager.verifyToken(invalidTokenAddress),
            false,
            "Token should not be supported");
    });
    
});
