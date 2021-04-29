const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const EscrowERC20 = artifacts.require("EscrowERC20");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Execution Manager Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        platformAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
        creator1Address,             // content nft Address
        creator2Address,             // creator Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "CID-1", 0, [[deployerAddress, 200]]],
        [2, "CID-2", 100, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;


    var escrowRawr;
    var escrowContent;
    var orderbookStorage;
    var executionManager;

    var manager_role;
    var default_admin_role;

    var assetData;

    beforeEach(async () => {
        // Set up NFT Contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address);
        contentStorage.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        var approvalPair = [[contentManager.address, true]];
        await contentManager.registerSystem(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        assetData = [content.address, 2];

        // Setup Content Escrow
        escrowContent = await EscrowNFTs.new();
        await escrowContent.__EscrowNFTs_init({from: deployerAddress});

        // Setup RAWR token and Escrow
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        escrowRawr = await EscrowERC20.new();
        await escrowRawr.__EscrowERC20_init(rawrToken.address, {from: deployerAddress});

        // Setup Orderbook Storage
        orderbookStorage = await OrderbookStorage.new();
        await orderbookStorage.__OrderbookStorage_init({from: deployerAddress});

        manager_role = await escrowRawr.MANAGER_ROLE();
        default_admin_role = await escrowRawr.DEFAULT_ADMIN_ROLE();

        // Setup Address Registry
        registry = await AddressRegistry.new();
        await registry.__AddressRegistry_init({from: deployerAddress});

        // register the royalty manager
        var addresses = [escrowRawr.address, escrowContent.address, orderbookStorage.address];
        var escrowIds = ["0xd4df6855", "0x13534f58", "0xe22271ab"];
        await registry.registerAddress(escrowIds, addresses, {from: deployerAddress});

        executionManager = await ExecutionManager.new();
        await executionManager.__ExecutionManager_init(registry.address, {from: deployerAddress});
        
        // Register the execution manager
        await escrowContent.registerManager(executionManager.address, {from:deployerAddress});
        await escrowRawr.registerManager(executionManager.address, {from:deployerAddress});
        await orderbookStorage.registerManager(executionManager.address, {from:deployerAddress});
        
        // Testing manager to create fake data
        await orderbookStorage.registerManager(testManagerAddress, {from:deployerAddress})
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // approve systems for player address
        await content.approveAllSystems(true, {from:playerAddress});
        await content.approveAllSystems(true, {from:player2Address});

        // Mint an asset
        var mintData = [playerAddress, [1], [10]];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        
        mintData = [player2Address, [2], [5]];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
    });

    it('Check if Execution Manager was deployed properly', async () => {
        assert.equal(
            executionManager.address != 0x0,
            true,
            "Execution Manager was not deployed properly.");
    });

    it('Supports the Execution Manager Interface', async () => {
        // _INTERFACE_ID_EXECUTION_MANAGER = 0x0000000C
        assert.equal(
            await executionManager.supportsInterface("0x0000000C"),
            true, 
            "the Execution manager doesn't support the RoyaltyManager interface");
    });

    it('Verify Escrows and token address', async () => {
        assert.equal(
            await executionManager.getToken(rawrId),
            rawrToken.address,
            "Execution Manager is not pointing to the correct token address.");

        assert.equal(
            await executionManager.getTokenEscrow(rawrId),
            escrowRawr.address,
            "Execution Manager is not pointing to the correct token escrow.");
        
        assert.equal(
            await executionManager.getNFTsEscrow(),
            escrowContent.address,
            "Execution Manager is not pointing to the correct asset escrow.");
    });

    it('Place Buy Order', async () => {
        var buyOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];

        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrId, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});
        
        assert.equal(
            await escrowRawr.getEscrowedTokensByOrder(1),
            web3.utils.toWei('2000', 'ether').toString(),
            "Tokens were not escrowed."
        )
    });
    
    it('Place Sell Order', async () => {

        var sellOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];

        await content.setApprovalForAll(escrowContent.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});
        
        assert.equal(
            await escrowContent.getEscrowedAssetsByOrder(1),
            2,
            "Tokens were not escrowed."
        )
    });

    it('Execute Buy Order', async () => {
        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrId, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 2];

        await content.setApprovalForAll(escrowContent.address, true, {from:player2Address});
        await executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, rawrId, {from:deployerAddress});

        assert.equal(
            await escrowRawr.getEscrowedTokensByOrder(1),
            web3.utils.toWei('1000', 'ether').toString(),
            "Payment was not withdrawn to the seller."
        )

        assert.equal(
            await escrowContent.getEscrowedAssetsByOrder(1),
            1,
            "Asset was not sent to escrow."
        )
    });

    it('Invalid Execute Buy Order', async () => {
        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrId, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [1, 2];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 1];

        await content.setApprovalForAll(escrowContent.address, true, {from:player2Address});
        await TruffleAssert.fails(
            executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, rawrId, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        
        paymentPerOrder = [web3.utils.toWei('1000', 'ether'), web3.utils.toWei('1000', 'ether')];
        await TruffleAssert.fails(
            executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, rawrId, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Execute Sell Order', async () => {
        await content.setApprovalForAll(escrowContent.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];

        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('1000', 'ether'), {from:player2Address});
        await executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrId, {from:deployerAddress});

        assert.equal(
            await escrowRawr.getEscrowedTokensByOrder(1),
            web3.utils.toWei('1000', 'ether').toString(),
            "Tokens were not sent to escrow."
        )
    });

    it('Invalid Execute Sell Order', async () => {
        await content.setApprovalForAll(escrowContent.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [1, 2];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 1];

        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('1000', 'ether'), {from:player2Address});
        await TruffleAssert.fails(
            executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrId, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:player2Address});
        paymentPerOrder = [web3.utils.toWei('1000', 'ether'), web3.utils.toWei('1000', 'ether')];
        await TruffleAssert.fails(
            executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrId, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Delete Order', async () => {
        var sellOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            false
        ];

        await orderbookStorage.placeOrder(1, sellOrderData, {from: testManagerAddress});
        await content.setApprovalForAll(escrowContent.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});
        
        await executionManager.deleteOrder(1, playerAddress, sellOrderData, {from: deployerAddress});

        assert.equal(
            await escrowContent.getEscrowedAssetsByOrder(1),
            0,
            "Assets are still escrowed."
        );
        
        var buyOrderData = [ 
            [content.address, 2],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];

        await orderbookStorage.placeOrder(2, buyOrderData, {from: testManagerAddress});
        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(2, rawrId, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});
        
        await executionManager.deleteOrder(2, playerAddress, buyOrderData, {from: deployerAddress});

        assert.equal(
            await escrowRawr.getEscrowedTokensByOrder(1),
            0,
            "Tokens are still escrowed."
        )
    });

    it('Claim Assets from Filled Buy Order', async () => {
        // Create and fill a buy order
        var buyOrderData = [ 
            [content.address, 2],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];
        await orderbookStorage.placeOrder(1, buyOrderData, {from: testManagerAddress});
        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrId, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [2];
        var asset = [content.address, 2];

        await content.setApprovalForAll(escrowContent.address, true, {from:player2Address});
        await executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, rawrId, {from:deployerAddress});

        await executionManager.claimOrders(playerAddress, orders, {from:deployerAddress});

        assert.equal(
            await escrowContent.getEscrowedAssetsByOrder(1),
            0,
            "Asset was not claimed properly."
        )
    });

    it('Claim Tokens from Filled Sell Order', async () => {
        // Create and fill a sell order
        var sellOrderData = [ 
            [content.address, 1],
            playerAddress,
            rawrId,
            web3.utils.toWei('1000', 'ether'),
            2,
            false
        ];

        await orderbookStorage.placeOrder(1, sellOrderData, {from: testManagerAddress});
        await content.setApprovalForAll(escrowContent.address, true, {from:playerAddress});
        await executionManager.placeSellOrder(1, playerAddress, [content.address, 1], 2, {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [2];

        await rawrToken.approve(escrowRawr.address, web3.utils.toWei('2000', 'ether'), {from:player2Address});
        await executionManager.executeSellOrder(player2Address, orders, paymentPerOrder, amounts, rawrId, {from:deployerAddress});

        await executionManager.claimOrders(playerAddress, orders, {from:deployerAddress});

        assert.equal(
            await escrowRawr.getEscrowedTokensByOrder(1),
            0,
            "Tokens are still escrowed."
        )
    });

    it('Verify User Token Balance', async () => {
        assert.equal(
            await executionManager.verifyUserBalance(playerAddress, rawrId, web3.utils.toWei('15000', 'ether')),
            true,
            "Player doesn't have the necessary token balance");
    });

    it('Verify Token is supported', async () => {
        assert.equal(
            await executionManager.verifyToken(rawrId),
            true,
            "Token should be supported.");
            
        assert.equal(
            await executionManager.verifyToken("0xda3f6852"),
            false,
            "Token should not be supported");
    });
    
});
