const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const EscrowERC20 = artifacts.require("EscrowERC20");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const OrderbookManager = artifacts.require("OrderbookManager");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const Exchange = artifacts.require("Exchange");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Exchange Contract', (accounts)=> {
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

        // Set default platform fees
        await exchange.setPlatformFees([[platformAddress, 30]], {from: deployerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 1]];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
    });

    // it('Check if Exchange was deployed properly', async () => {
    //     assert.equal(
    //         exchange.address != 0x0,
    //         true,
    //         "Exchange was not deployed properly.");
    // });

    // it('Set Platform Royalty Fees', async () => {
    //     currentExchangeFees = await exchange.getPlatformFees();

    //     assert.equal(
    //         currentExchangeFees[0][0] == platformAddress && currentExchangeFees[0][1].toString() == 30,
    //         true,
    //         "Default Exchange Fees are incorrect.");


    //     // set platform fees to 30bps
    //     var newFees = [[platformAddress, 50]];
    //     await exchange.setPlatformFees(newFees, {from: deployerAddress});

    //     currentExchangeFees = await exchange.getPlatformFees();

    
    //     assert.equal(
    //         currentExchangeFees[0][0] == platformAddress && currentExchangeFees[0][1].toString() == 50,
    //         true,
    //         "Newly changed Exchange Fees are incorrect.");
    // });

    // it('Place buy order', async () => {

    // });

    // it('Place sell order', async () => {

    // });

    // it('Delete Orders', async () => {

    // });

    // it('Fill buy order', async () => {

    // });

    // it('Fill sell order', async () => {

    // });

    // it('Claim Fulfilled order', async () => {

    // });
    
});
