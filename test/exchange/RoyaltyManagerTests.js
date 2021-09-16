const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const EscrowERC20 = artifacts.require("EscrowERC20");
const ExchangeFeePool = artifacts.require("ExchangeFeePool");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const AddressResolver = artifacts.require("AddressResolver");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

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
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
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
        
        // Setup Content Contract Royalty
        var assetRoyalty = [[creator1Address, web3.utils.toWei('0.02', 'ether')], [creator2Address, web3.utils.toWei('0.01', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty);

        assetData = [content.address, 2];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        escrow = await EscrowERC20.new();
        await escrow.__EscrowERC20_init(rawrToken.address, {from: deployerAddress});
        feePool = await ExchangeFeePool.new();
        await feePool.__ExchangeFeePool_init(web3.utils.toWei('0.003', 'ether'), {from: deployerAddress});

        manager_role = await escrow.MANAGER_ROLE();
        default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();

        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});

        // register the royalty manager
        await resolver.registerAddress(["0xd4df6855", "0x018d6f5c"], [escrow.address, feePool.address], {from: deployerAddress});

        royaltyManager = await RoyaltyManager.new();
        await royaltyManager.__RoyaltyManager_init(resolver.address, {from: deployerAddress});
        
        // Register the royalty manager
        await escrow.registerManager(royaltyManager.address, {from:deployerAddress});
        await feePool.registerManager(royaltyManager.address, {from:deployerAddress});
        
        // Testing manager to create fake data
        await escrow.registerManager(testManagerAddress, {from:deployerAddress})
        await feePool.registerManager(testManagerAddress, {from:deployerAddress});

        // add funds
        await feePool.updateDistributionFunds([stakingFund], [web3.utils.toWei('1', 'ether')], {from:testManagerAddress});
        
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
        // INTERFACE_ID_ROYALTY_MANAGER = 0x0000000D
        assert.equal(
            await royaltyManager.supportsInterface("0x0000000D"),
            true, 
            "the Royalty manager doesn't support the RoyaltyManager interface");
    });

    it('Set Platform Fees and check', async () => {

        TruffleAssert.eventEmitted(
            await feePool.setRate(web3.utils.toWei('0.005', 'ether'), {from:testManagerAddress}),
            'FeeUpdated'
        );

        assert.equal(
            await feePool.rate(),
            web3.utils.toWei('0.005', 'ether'), 
            "updated Exchange Fees rate is incorrect.");
    });

    it('Deposit Royalty', async () => {
        creators = [creator1Address, creator2Address];
        amounts = [web3.utils.toWei('200', 'ether'), web3.utils.toWei('100', 'ether')];

        await rawrToken.approve(escrow.address, web3.utils.toWei('330', 'ether'), {from:playerAddress});
        await royaltyManager.depositRoyalty(playerAddress, rawrId, creators, amounts, {from: deployerAddress});

        assert.equal(
            await royaltyManager.claimableRoyalties(creator1Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );
        
        assert.equal(
            await royaltyManager.claimableRoyalties(creator2Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('100', 'ether').toString(),
            "Royalty was not deposited in Creator 2 address escrow."
        );

        await royaltyManager.depositPlatformFees(playerAddress, rawrId, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
        
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

        await royaltyManager.transferPlatformFees(rawrId, 1, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        assert.equal(
            await royaltyManager.claimableRoyalties(creator1Address, rawrId, {from: creator1Address}),
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );
        
        assert.equal(
            await royaltyManager.claimableRoyalties(creator2Address, rawrId, {from: creator1Address}),
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
        var results = await royaltyManager.payableRoyalties(assetData, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

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
            await royaltyManager.claimableRoyalties(creator1Address, rawrId, {from: creator1Address}),
            0,
            "Royalty was not claimed yet."
        );
        
        TruffleAssert.eventEmitted(
            await royaltyManager.claimRoyalties(creator2Address, rawrId,  {from: deployerAddress}),
            'RoyaltiesClaimed'
        );
        
        assert.equal(
            await royaltyManager.claimableRoyalties(creator2Address, rawrId, {from: creator1Address}),
            0,
            "Royalty was not claimed yet."
        );
    });
    
});
