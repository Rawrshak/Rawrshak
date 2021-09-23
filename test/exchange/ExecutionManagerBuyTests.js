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

contract('Execution Manager Contract Buy Tests', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
        creator1Address,
        creator2Address
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
        var result = await contentFactory.createContracts(creator1Address, 20000, "arweave.net/tx-contract-uri");
        
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);
            
        // Add 2 assets
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, deployerAddress, 20000],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, constants.ZERO_ADDRESS, 0],
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

        // Setup Orderbook
        orderbook = await Orderbook.new();
        await orderbook.__Orderbook_init(resolver.address, {from: deployerAddress});

        // register the managers
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

    it('Check if Execution Manager was deployed properly', async () => {
        assert.equal(
            executionManager.address != 0x0,
            true,
            "Execution Manager was not deployed properly.");
    });

    it('Supports the Execution Manager Interface', async () => {
        // INTERFACE_ID_EXECUTION_MANAGER = 0x0000000C
        assert.equal(
            await executionManager.supportsInterface("0x0000000C"),
            true, 
            "the Execution manager doesn't support the RoyaltyManager interface");
    });

    it('Verify Escrows and token address', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();

        assert.equal(
            await executionManager.verifyToken(rawrToken.address),
            true,
            "Execution Manager is not pointing to the correct token address.");

        assert.equal(
            await executionManager.tokenEscrow(),
            tokenEscrow.address,
            "Execution Manager is not pointing to the correct token escrow.");
        
        assert.equal(
            await executionManager.nftsEscrow(),
            nftEscrow.address,
            "Execution Manager is not pointing to the correct asset escrow.");
    });

    it('Place Buy Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();

        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});
        
        assert.equal(
            await tokenEscrow.escrowedTokensByOrder(1),
            web3.utils.toWei('2000', 'ether').toString(),
            "Tokens were not escrowed."
        )
    });

    it('Execute Buy Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [1];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 2];

        await content.setApprovalForAll(nftEscrow.address, true, {from:player2Address});
        await executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, {from:deployerAddress});

        assert.equal(
            await tokenEscrow.escrowedTokensByOrder(1),
            web3.utils.toWei('1000', 'ether').toString(),
            "Payment was not withdrawn to the seller."
        )

        var assetData = await nftEscrow.escrowedAsset(1);
        assert.equal(
            assetData.contentAddress == content.address && assetData.tokenId == 2,
            true,
            "Asset was not sent to escrow."
        )
    });

    it('Invalid Execute Buy Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();
        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [1, 2];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [1];
        var asset = [content.address, 1];

        await content.setApprovalForAll(nftEscrow.address, true, {from:player2Address});
        await TruffleAssert.fails(
            executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        paymentPerOrder = [web3.utils.toWei('1000', 'ether'), web3.utils.toWei('1000', 'ether')];
        await TruffleAssert.fails(
            executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Claim Assets from Filled Buy Order', async () => {
        await RawrTokenSetup();
        await ExchangeSetup();
        await ContentContractSetup();

        // Create and fill a buy order
        var buyOrderData = [ 
            [content.address, 2],
            playerAddress,
            rawrToken.address,
            web3.utils.toWei('1000', 'ether'),
            2,
            true
        ];
        
        var orderId = await orderbook.ordersLength()
        await orderbook.placeOrder(buyOrderData, {from: deployerAddress});
        await rawrToken.approve(tokenEscrow.address, web3.utils.toWei('2000', 'ether'), {from:playerAddress});
        await executionManager.placeBuyOrder(orderId, rawrToken.address, playerAddress, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});

        var orders = [orderId];
        var paymentPerOrder = [web3.utils.toWei('1000', 'ether')];
        var amounts = [2];
        var asset = [content.address, 2];

        await content.setApprovalForAll(nftEscrow.address, true, {from:player2Address});
        await executionManager.executeBuyOrder(player2Address, orders, paymentPerOrder, amounts, asset, {from:deployerAddress});

        await executionManager.claimOrders(playerAddress, orders, {from:deployerAddress});

        assert.equal(
            await nftEscrow.escrowedAmounts(orderId),
            0,
            "Asset was not claimed properly."
        )
    });
});
