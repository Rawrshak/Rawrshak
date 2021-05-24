const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const EscrowERC20 = artifacts.require("EscrowERC20");
const ExchangeFeePool = artifacts.require("ExchangeFeePool");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Royalty Manager Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        platformAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
        creator1Address,            // content nft Address
        creator2Address,            // creator Address
        playerAddress,              // malicious address
        stakingFund,                // staking fund address
    ] = accounts;

    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "CID-1", 0, [[deployerAddress, 200]]],
        [2, "CID-2", 100, []],
    ];

    var rawrId = "0xd4df6855";
    var rawrToken;
    var royaltyManager;
    var escrow;
    var manager_role;
    var default_admin_role;
    var assetData;

    beforeEach(async () => {
        // Set up NFT Contract
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        // Setup Content Contract Royalty
        var assetRoyalty = [[creator1Address, 200], [creator2Address, 100]];
        await contentManager.setContractRoyalties(assetRoyalty);

        assetData = [content.address, 2];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        escrow = await EscrowERC20.new();
        await escrow.__EscrowERC20_init(rawrToken.address, {from: deployerAddress});
        feePool = await ExchangeFeePool.new();
        await feePool.__ExchangeFeePool_init(30, {from: deployerAddress});

        manager_role = await escrow.MANAGER_ROLE();
        default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();

        registry = await AddressRegistry.new();
        await registry.__AddressRegistry_init({from: deployerAddress});

        // register the royalty manager
        await registry.registerAddress(["0xd4df6855", "0x018d6f5c"], [escrow.address, feePool.address], {from: deployerAddress});

        royaltyManager = await RoyaltyManager.new();
        await royaltyManager.__RoyaltyManager_init(registry.address, {from: deployerAddress});
        
        // Register the royalty manager
        await escrow.registerManager(royaltyManager.address, {from:deployerAddress});
        await feePool.registerManager(royaltyManager.address, {from:deployerAddress});
        
        // Testing manager to create fake data
        await escrow.registerManager(testManagerAddress, {from:deployerAddress})
        await feePool.registerManager(testManagerAddress, {from:deployerAddress});

        // add funds
        await feePool.updateDistributionFunds([stakingFund], [10000], {from:testManagerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    });

    it('Check if Royalty Manager was deployed properly', async () => {
        assert.equal(
            royaltyManager.address != 0x0,
            true,
            "Royalty Manager was not deployed properly.");
    });

    it('Supports the Royalty Manager Interface', async () => {
        // _INTERFACE_ID_ROYALTY_MANAGER = 0x0000000D
        assert.equal(
            await royaltyManager.supportsInterface("0x0000000D"),
            true, 
            "the Royalty manager doesn't support the RoyaltyManager interface");
    });

    it('Set Platform Fees and check', async () => {

        TruffleAssert.eventEmitted(
            await feePool.setRate(50, {from:testManagerAddress}),
            'FeeUpdated'
        );

        assert.equal(
            await feePool.rate(),
            50, 
            "updated Exchange Fees rate is incorrect.");
    });

    it('Deposit Royalty', async () => {
        creators = [creator1Address, creator2Address];
        amounts = [web3.utils.toWei('200', 'ether'), web3.utils.toWei('100', 'ether')];

        await rawrToken.approve(escrow.address, web3.utils.toWei('330', 'ether'), {from:playerAddress});
        await royaltyManager.depositRoyalty(playerAddress, rawrId, creators, amounts, {from: deployerAddress});

        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator1Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );
        
        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator2Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('100', 'ether').toString(),
            "Royalty was not deposited in Creator 2 address escrow."
        );

        await royaltyManager.depositPlatformRoyalty(playerAddress, rawrId, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
        
        assert.equal(
            await rawrToken.balanceOf(feePool.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not sent to the fee pool"
        );

        assert.equal(
            await feePool.totalFeePool(rawrId, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not recorded in the fee pool"
        );
    });

    it('Transfer Royalty from escrow to royalty owner', async () => {
        // deposit 10000 RAWR tokens for Order 1 
        
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: testManagerAddress});

        creators = [creator1Address, creator2Address];
        amounts = [web3.utils.toWei('200', 'ether'), web3.utils.toWei('100', 'ether')];

        await royaltyManager.transferRoyalty(rawrId, 1, creators, amounts, {from:deployerAddress});

        await royaltyManager.transferPlatformRoyalty(rawrId, 1, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator1Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );
        
        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator2Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('100', 'ether').toString(),
            "Royalty was not deposited in Creator 2 address escrow."
        );
        
        // check if amounts were moved from the escrow for the order to claimable for the creator
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('9670', 'ether').toString(), 
            "Escrowed tokens for the Order was not updated."
        );
        
        assert.equal(
            await rawrToken.balanceOf(feePool.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not sent to the fee pool"
        );

        assert.equal(
            await feePool.totalFeePool(rawrId, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not recorded in the fee pool"
        );
    });

    it('Get Royalties for an asset', async () => {
        var results = await royaltyManager.getRequiredRoyalties(assetData, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        assert.equal (
            results[0].length, 2, 
            "Incorrect amount of royalty accounts to pay"
        );

        assert.equal (
            results[1][0].toString() == web3.utils.toWei('200', 'ether').toString() && 
            results[1][1].toString() == web3.utils.toWei('100', 'ether').toString(), 
            true, 
            "Incorrect amount of royalty to pay"
        );
        
        assert.equal (
            results[2].toString() == web3.utils.toWei('9670', 'ether').toString(), 
            true, 
            "Incorrect amount remaining."
        );

    });

    it('Claim Royalties', async () => {
        creators = [creator1Address, creator2Address];
        amounts = [web3.utils.toWei('200', 'ether'), web3.utils.toWei('100', 'ether')];

        await rawrToken.approve(escrow.address, web3.utils.toWei('300', 'ether'), {from:playerAddress});
        await royaltyManager.depositRoyalty(playerAddress, rawrId, creators, amounts, {from: deployerAddress});

        // claim royalties
        TruffleAssert.eventEmitted(
            await royaltyManager.claimRoyalties(creator1Address, rawrId,  {from: deployerAddress}),
            'RoyaltiesClaimed'
        );

        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator1Address, rawrId, {from: creator1Address}),
            0,
            "Royalty was not claimed yet."
        );
        
        TruffleAssert.eventEmitted(
            await royaltyManager.claimRoyalties(creator2Address, rawrId,  {from: deployerAddress}),
            'RoyaltiesClaimed'
        );
        
        assert.equal(
            await royaltyManager.claimableRoyaltyAmount(creator2Address, rawrId, {from: creator1Address}),
            0,
            "Royalty was not claimed yet."
        );
    });
    
});
