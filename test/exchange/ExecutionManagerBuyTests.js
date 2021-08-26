const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const EscrowERC20 = artifacts.require("EscrowERC20");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const AddressRegistry = artifacts.require("AddressRegistry");
const ContractRegistry = artifacts.require("ContractRegistry");
const TagsManager = artifacts.require("TagsManager");
const TruffleAssert = require("truffle-assertions");

contract('Execution Manager Contract Buy Tests', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        testManagerAddress,         // Only for putting in data for testing
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 0, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
    ];
    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    var escrowRawr;
    var escrowContent;
    var orderbookStorage;
    var executionManager;
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    var manager_role;
    var default_admin_role;

    var assetData;

    beforeEach(async () => {
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();
        tagsManager = await TagsManager.new();
        await tagsManager.__TagsManager_init(registry.address);

        // Set up NFT Contract
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address, tagsManager.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        // var approvalPair = [[contentManager.address, true]];
        // await contentManager.registerSystem(approvalPair);

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
        var mintData = [playerAddress, [1], [10], 0, zeroAddress, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        
        mintData = [player2Address, [2], [5], 0, zeroAddress, []];
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
            await executionManager.token(rawrId),
            rawrToken.address,
            "Execution Manager is not pointing to the correct token address.");

        assert.equal(
            await executionManager.tokenEscrow(rawrId),
            escrowRawr.address,
            "Execution Manager is not pointing to the correct token escrow.");
        
        assert.equal(
            await executionManager.nftsEscrow(),
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
            await escrowRawr.escrowedTokensByOrder(1),
            web3.utils.toWei('2000', 'ether').toString(),
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
            await escrowRawr.escrowedTokensByOrder(1),
            web3.utils.toWei('1000', 'ether').toString(),
            "Payment was not withdrawn to the seller."
        )

        assert.equal(
            await escrowContent.escrowedAssetsByOrder(1),
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
            await escrowContent.escrowedAssetsByOrder(1),
            0,
            "Asset was not claimed properly."
        )
    });
});
