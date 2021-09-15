const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const EscrowERC20 = artifacts.require("EscrowERC20");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const ExchangeFeePool = artifacts.require("ExchangeFeePool");
const OrderbookManager = artifacts.require("OrderbookManager");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const Exchange = artifacts.require("Exchange");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('Exchange Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        platformAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
        creator1Address,             // content nft Address
        creator2Address,             // creator Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
        stakingFund,                // staking fund address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[creator1Address, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    // Escrow contracts
    var escrowRawr;
    var escrowContent;
    var orderbookStorage;

    // Manager contracts
    var executionManager;
    var royaltyManager;
    var orderbookManager;

    // Exchange contract
    var exchange;

    var manager_role;
    var default_admin_role;

    var nftAssetData;

    beforeEach(async () => {
        // Set up NFT Contract
        accessControlManager = await AccessControlManager.new();
        await accessControlManager.__AccessControlManager_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, accessControlManager.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, accessControlManager.address);
        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await contentStorage.setParent(content.address);
        await accessControlManager.grantRole(await accessControlManager.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.setParent(content.address);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        nftAssetData = [content.address, 2];

        // Setup Content Escrow
        escrowContent = await EscrowNFTs.new();
        await escrowContent.__EscrowNFTs_init({from: deployerAddress});

        // Setup RAWR token and Escrow
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        escrowRawr = await EscrowERC20.new();
        await escrowRawr.__EscrowERC20_init(rawrToken.address, {from: deployerAddress});
        feePool = await ExchangeFeePool.new();
        await feePool.__ExchangeFeePool_init(web3.utils.toWei('0.003', 'ether'), {from: deployerAddress});

        // Setup Orderbook Storage
        orderbookStorage = await OrderbookStorage.new();
        await orderbookStorage.__OrderbookStorage_init({from: deployerAddress});

        manager_role = await escrowRawr.MANAGER_ROLE();
        default_admin_role = await escrowRawr.DEFAULT_ADMIN_ROLE();

        // Setup Address Registry
        registry = await AddressRegistry.new();
        await registry.__AddressRegistry_init({from: deployerAddress});

        // register the royalty manager
        var addresses = [escrowRawr.address, escrowContent.address, orderbookStorage.address, feePool.address];
        var escrowIds = ["0xd4df6855", "0x13534f58", "0xe22271ab", "0x018d6f5c"];
        await registry.registerAddress(escrowIds, addresses, {from: deployerAddress});

        // Create and Register the execution manager
        executionManager = await ExecutionManager.new();
        await executionManager.__ExecutionManager_init(registry.address, {from: deployerAddress});
        await escrowContent.registerManager(executionManager.address, {from:deployerAddress});
        await escrowRawr.registerManager(executionManager.address, {from:deployerAddress});
        await orderbookStorage.registerManager(executionManager.address, {from:deployerAddress});
        
        // Create and Register the orderbook manager
        orderbookManager = await OrderbookManager.new();
        await orderbookManager.__OrderbookManager_init(registry.address, {from: deployerAddress});
        await orderbookStorage.registerManager(orderbookManager.address, {from:deployerAddress})
        
        // Create and Register the Royalty Manager
        royaltyManager = await RoyaltyManager.new();
        await royaltyManager.__RoyaltyManager_init(registry.address, {from: deployerAddress});
        await escrowRawr.registerManager(royaltyManager.address, {from:deployerAddress})
        await feePool.registerManager(royaltyManager.address, {from:deployerAddress});
        
        // make deployer the manager of the fee pool
        await feePool.registerManager(deployerAddress, {from:deployerAddress});

        // add funds
        await feePool.updateDistributionFunds([stakingFund], [web3.utils.toWei('1', 'ether')], {from:deployerAddress});

        // Create the exchange contract
        exchange = await Exchange.new();
        await exchange.__Exchange_init(
            royaltyManager.address,
            orderbookManager.address,
            executionManager.address,
            {from: deployerAddress});
        await royaltyManager.transferOwnership(exchange.address, {from: deployerAddress});
        await orderbookManager.transferOwnership(exchange.address, {from: deployerAddress});
        await executionManager.transferOwnership(exchange.address, {from: deployerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // Mint an asset
        var mintData = [playerAddress, [1, 2], [10, 1], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        
        mintData = [player2Address, [1, 2], [10, 10], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        // Set contract royalties
        var assetRoyalty = [[creator2Address, web3.utils.toWei('0.02', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty);
    });

    it('Check if Exchange was deployed properly', async () => {
        assert.equal(
            exchange.address != 0x0,
            true,
            "Exchange was not deployed properly.");
    });

    it('Place buy order', async () => {
        var orderData = [
            [content.address, 1],
            player2Address,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: player2Address});

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

        assert.equal(
            await escrowRawr.escrowedTokensByOrder(orderId),
            web3.utils.toWei('1000', 'ether'),
            "1000 RAWR tokens were not escrowed");

        assert.equal(
            await rawrToken.balanceOf(escrowRawr.address),
            web3.utils.toWei('1000', 'ether'),
            "Escrow Should own 1000 tokens");
    });

    it('Place sell order', async () => {
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrId,
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

        assert.equal(
            await escrowContent.escrowedAssetsByOrder(orderId),
            1,
            "1 NFT was not escrowed");

        assert.equal(
            await content.balanceOf(escrowContent.address, 1),
            1,
            "Escrow Should own 1 asset in the Content contract");
    });

    it('Delete Orders', async () => {
        var orderData = [
            [content.address, 1],
            player2Address,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: player2Address});

        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: player2Address});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // var storedOrder = await exchange.getOrder(orderId);
        // console.log(storedOrder);

        var orderDeleted = await exchange.deleteOrders(orderId, {from: player2Address});
        TruffleAssert.eventEmitted(
            orderDeleted,
            'OrderDeleted'
        );

        assert.equal(
            await escrowRawr.escrowedTokensByOrder(orderId),
            0,
            "1000 RAWR tokens were not escrowed");

        assert.equal(
            await rawrToken.balanceOf(escrowRawr.address),
            0,
            "Escrow Should own 1000 tokens");
            
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            web3.utils.toWei('10000', 'ether').toString(),
            "Escrow Should own 1000 tokens");
    });

    it('Fill buy order', async () => {
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], [content.address, 1], rawrId, {from: player2Address});
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
            await feePool.totalFeePool(rawrId),
            web3.utils.toWei('3', 'ether'),
            "Fee Pool didn't store the correct amount of RAWR tokens.");
            
        assert.equal(
            await rawrToken.balanceOf(feePool.address),
            web3.utils.toWei('3', 'ether'),
            "Fee Pool doesn't hold the correct amount of RAWR tokens.");
    });

    it('Fill sell order', async () => {
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrId,
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
        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: player2Address});
        var sellOrderFilled = await exchange.fillSellOrder([orderId], [1], [content.address, 1], rawrId, {from: player2Address});
    
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
            await feePool.totalFeePool(rawrId),
            web3.utils.toWei('3', 'ether'),
            "Fee Pool didn't store the correct amount of RAWR tokens.");
            
        assert.equal(
            await rawrToken.balanceOf(feePool.address),
            web3.utils.toWei('3', 'ether'),
            "Fee Pool doesn't hold the correct amount of RAWR tokens.");
    });

    it('Claim Fulfilled order', async () => {
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], [content.address, 1], rawrId, {from: player2Address});
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
        var orderData = [
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            1,
            true
        ];

        // Player 1 Creates a buy order for an asset
        await rawrToken.approve(await exchange.tokenEscrow(rawrId), web3.utils.toWei('1000', 'ether'), {from: playerAddress});
        var orderPlacedEvents = await exchange.placeOrder(orderData, {from: playerAddress});
        TruffleAssert.eventEmitted(
            orderPlacedEvents,
            'OrderPlaced'
        );
        var orderId = orderPlacedEvents.logs[0].args.orderId.toString();

        // player 2 fills the buy order by selling the asset and receiving payment minus royalties
        await content.setApprovalForAll(await exchange.nftsEscrow(), true, {from:player2Address});
        var buyOrderFilled = await exchange.fillBuyOrder([orderId], [1], [content.address, 1], rawrId, {from: player2Address});
        TruffleAssert.eventEmitted(
            buyOrderFilled,
            'BuyOrdersFilled'
        );
        
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            web3.utils.toWei('10977', 'ether').toString(),
            "Player should have received the 977 tokens as payment");

        // check claimable royalty for creator address
        assert.equal(
            await exchange.claimableRoyaltyAmount(rawrId, {from: creator1Address}),
            web3.utils.toWei('20', 'ether').toString(),
            "Creator's address doesn't have the correct amount of royalty");

        await exchange.claimRoyalties(rawrId, {from: creator1Address});
        assert.equal(
            (await rawrToken.balanceOf(creator1Address)).toString(),
            web3.utils.toWei('20', 'ether').toString(),
            "Creator's address should own 20 tokens");
    });
    
});
