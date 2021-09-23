const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentFactory = artifacts.require("ContentFactory");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const Erc20Escrow = artifacts.require("Erc20Escrow");
const NftEscrow = artifacts.require("NftEscrow");
const Orderbook = artifacts.require("Orderbook");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const ExecutionManager = artifacts.require("ExecutionManager");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const Exchange = artifacts.require("Exchange");
const AddressResolver = artifacts.require("AddressResolver");
const MockStaking = artifacts.require("MockStaking");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('Exchange Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        creator1Address,             // content nft Address
        creator2Address,             // creator Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
        staker1,                    // staking address
    ] = accounts;

    // NFT
    var content;
    var contentFactory;
    var contentManager;

    // Rawr Token 
    var rawrToken;

    // Exchange contract
    var exchange;

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
        var result = await contentFactory.createContracts(creator1Address, 20000, "arweave.net/tx-contract-uri");
        
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);
            
        // Add 2 assets
        // Asset 1 has 200 basis points towards creator 1
        // Asset 2 has 200 basis points towards creator 1, 100 basis points towards creator 2
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, creator1Address, 20000],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, constants.ZERO_ADDRESS, 0],
        ];
        await contentManager.addAssetBatch(asset);

        // Mint an asset
        var mintData = [playerAddress, [1, 2], [10, 1], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        
        mintData = [player2Address, [1, 2], [10, 10], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
        
        // exchange.addToken
        await exchange.addSupportedToken(rawrToken.address, {from:deployerAddress});
    }

    async function ExchangeSetup() {
        // Setup Content Escrow
        nftEscrow = await NftEscrow.new();
        await nftEscrow.__NftEscrow_init({from: deployerAddress});
        
        tokenEscrow = await Erc20Escrow.new();
        await tokenEscrow.__Erc20Escrow_init({from: deployerAddress});
        
        // 30 basis points
        feesEscrow = await ExchangeFeesEscrow.new();
        await feesEscrow.__ExchangeFeesEscrow_init(resolver.address, {from: deployerAddress});

        orderbook = await Orderbook.new();
        await orderbook.__Orderbook_init(resolver.address, {from: deployerAddress});

        executionManager = await ExecutionManager.new();
        await executionManager.__ExecutionManager_init(resolver.address, {from: deployerAddress});
        
        royaltyManager = await RoyaltyManager.new();
        await royaltyManager.__RoyaltyManager_init(resolver.address, {from: deployerAddress});
        
        staking = await MockStaking.new(resolver.address, {from: deployerAddress});

        // register the exchange contracts on the address resolver
        var addresses = [tokenEscrow.address, nftEscrow.address, feesEscrow.address, orderbook.address, executionManager.address, royaltyManager.address, staking.address];
        var escrowIds = ["0x29a264aa", "0x87d4498b", "0x7f170836", "0xd9ff7618", "0x018869a9", "0x2c7e992e", "0x1b48faca"];
        await resolver.registerAddress(escrowIds, addresses, {from: deployerAddress});

        // Register the managers
        await nftEscrow.registerManager(executionManager.address, {from:deployerAddress});
        await tokenEscrow.registerManager(executionManager.address, {from:deployerAddress});
        await tokenEscrow.registerManager(royaltyManager.address, {from:deployerAddress});
        await feesEscrow.registerManager(royaltyManager.address, {from:deployerAddress});
        await feesEscrow.registerManager(staking.address, {from:deployerAddress});
        
        // add stakers
        await staking.stake(web3.utils.toWei('100', 'ether'), {from: staker1});
        await feesEscrow.setRate(3000, {from: deployerAddress});

        exchange = await Exchange.new();
        await exchange.__Exchange_init(
            royaltyManager.address,
            orderbook.address,
            executionManager.address,
            {from: deployerAddress});
        await royaltyManager.transferOwnership(exchange.address, {from: deployerAddress});
        await orderbook.transferOwnership(exchange.address, {from: deployerAddress});
        await executionManager.transferOwnership(exchange.address, {from: deployerAddress});
    }

    beforeEach(async () => {
        await ExchangeSetup();
    });

    it('Check if Exchange was deployed properly', async () => {
        assert.equal(
            exchange.address != 0x0,
            true,
            "Exchange was not deployed properly.");
    });

    it('Place buy order', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            player2Address,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: player2Address});

        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: player2Address});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );

        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        order = await exchange.getOrder(orderId);
        assert.equal(
            order.owner,
            player2Address,
            "Buy Order was placed");

        var tokenEscrowAddr = await exchange.tokenEscrow();
        assert.equal(tokenEscrowAddr, tokenEscrow.address, "Incorrect token address");

        var exchangeTokenEscrow = await Erc20Escrow.at(tokenEscrowAddr);
        assert.equal(
            await exchangeTokenEscrow.escrowedTokensByOrder(orderId),
            web3.utils.toWei('1000', 'ether'),
            "1000 RAWR tokens were not escrowed");

        assert.equal(
            await rawrToken.balanceOf(exchangeTokenEscrow.address),
            web3.utils.toWei('1000', 'ether'),
            "Escrow Should own 1000 tokens");
    });

    it('Place sell order', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            false
        ];

        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:playerAddress});
        
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );

        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        order = await exchange.getOrder(orderId);
        assert.equal(
            order.owner,
            playerAddress,
            "Sell Order was placed");

        var nftEscrowAddr = await exchange.nftsEscrow();
        assert.equal(nftEscrowAddr, nftEscrow.address, "Incorrect content address");

        var exchangeNftEscrow = await NftEscrow.at(nftEscrowAddr);
        assert.equal(
            await exchangeNftEscrow.escrowedAmounts(orderId),
            1,
            "1 NFT was not escrowed");

        assert.equal(
            await content.balanceOf(exchangeNftEscrow.address, 1),
            1,
            "Escrow Should own 1 asset in the Content contract");
    });

    it('Delete Orders', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            player2Address,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: player2Address});

        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: player2Address});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        var ordersDeleted = await exchange.cancelOrders([orderId], {from: player2Address});
        TruffleAssert.eventEmitted(
            ordersDeleted,
            'OrdersDeleted'
        );

        var tokenEscrowAddr = await exchange.tokenEscrow();
        var exchangeTokenEscrow = await Erc20Escrow.at(tokenEscrowAddr);
        assert.equal(
            await exchangeTokenEscrow.escrowedTokensByOrder(orderId),
            0,
            "1000 RAWR tokens were not escrowed");

        assert.equal(
            await rawrToken.balanceOf(exchangeTokenEscrow.address),
            0,
            "Escrow Should own 1000 tokens");
            
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            web3.utils.toWei('10000', 'ether').toString(),
            "Escrow Should own 1000 tokens");
    });

    it('Fill buy order', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], {from: player2Address});
        TruffleAssert.eventEmitted(
            buyOrderFilled,
            'BuyOrdersFilled'
        );
        
        // platform has 30 basis points and creator has 200 basis points from royalties so player2Address should only have
        // 10000 (initial) + 977 from the sale of their asset
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            web3.utils.toWei('10977', 'ether').toString(),
            "Player should have received the 977 tokens as payment");

        assert.equal(
            await feesEscrow.totalFees(rawrToken.address),
            web3.utils.toWei('3', 'ether'),
            "Platform Fees Escrow didn't store the correct amount of RAWR tokens.");
            
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            web3.utils.toWei('3', 'ether'),
            "Platform Fees Escrow doesn't hold the correct amount of RAWR tokens.");
    });

    it('Fill sell order', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            false
        ];

        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );

        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: player2Address});
        var sellOrderFilled = await exchange.fillSellOrder([orderId], [1], {from: player2Address});
    
        TruffleAssert.eventEmitted(
            sellOrderFilled,
            'SellOrdersFilled'
        );
        
        // Player 2 originally has 10, but after buying 1 more, he should have 11
        assert.equal(
            await content.balanceOf(player2Address, 1),
            11,
            "Player 2 didn't properly receive his purchased asset.");
            
        assert.equal(
            await feesEscrow.totalFees(rawrToken.address),
            web3.utils.toWei('3', 'ether'),
            "Platform Fees Escrow didn't store the correct amount of RAWR tokens.");
            
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            web3.utils.toWei('3', 'ether'),
            "Platform Fees Escrow doesn't hold the correct amount of RAWR tokens.");
    });

    it('Claim Fulfilled order', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], {from: player2Address});
        TruffleAssert.eventEmitted(
            buyOrderFilled,
            'BuyOrdersFilled'
        );
        
        // Claim player 1's purchased asset
        await exchange.claimOrders([orderId], {from: playerAddress});
        
        // Player 1 originally has 10, but after buying 1 more, he should have 11
        assert.equal(
            await content.balanceOf(playerAddress, 1),
            11,
            "Player 1 didn't properly receive his purchased asset.");
    });

    it('Claim Creator Royalties', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();

        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], {from: player2Address});
        TruffleAssert.eventEmitted(
            buyOrderFilled,
            'BuyOrdersFilled'
        );
        
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            web3.utils.toWei('10977', 'ether').toString(),
            "Player should have received the 977 tokens as payment");

        // check claimable royalty for creator address
        var claimable = await exchange.claimableRoyalties({from: creator1Address});
        assert.equal(
            claimable.tokens[0] == rawrToken.address &&
            claimable.amounts[0] == web3.utils.toWei('20', 'ether').toString(),
            true ,
            "Creator's address doesn't have the correct amount of royalty");

        await exchange.claimRoyalties({from: creator1Address});
        assert.equal(
            (await rawrToken.balanceOf(creator1Address)).toString(),
            web3.utils.toWei('20', 'ether').toString(),
            "Creator's address should own 20 tokens");
    });
    
});
