const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const ContentFactory = artifacts.require("ContentFactory");
const AccessControlManager = artifacts.require("AccessControlManager");
const Erc20Escrow = artifacts.require("Erc20Escrow");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const AddressResolver = artifacts.require("AddressResolver");
const MockStaking = artifacts.require("MockStaking");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('Royalty Manager Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        testManagerAddress,         // Only for putting in data for testing
        creatorAddress,            // content nft Address
        playerAddress,              // malicious address
        staker1,                    // Staker 1
    ] = accounts;

    var resolver;
    var contentFactory;
    var content;
    var contentManager;

    var rawrToken;
    var royaltyManager;
    var escrow;

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
        var result = await contentFactory.createContracts(creatorAddress, 20000, "arweave.net/tx-contract-uri");
        
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);
            
        // Add 2 assets
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, deployerAddress, 20000],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, constants.ZERO_ADDRESS, 0],
        ];
        await contentManager.addAssetBatch(asset);
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    }

    async function RoyaltyManagerSetup() {
        staking = await MockStaking.new(resolver.address, {from: deployerAddress});
        await feesEscrow.registerManager(staking.address, {from:deployerAddress});
        
        // register the royalty manager
        await resolver.registerAddress(["0x29a264aa", "0x7f170836", "0x1b48faca"], [escrow.address, feesEscrow.address, staking.address], {from: deployerAddress});
        
        await staking.stake(web3.utils.toWei('100', 'ether'), {from: staker1});
        await feesEscrow.setRate(3000, {from: deployerAddress});

        // Register the royalty manager
        await escrow.registerManager(royaltyManager.address, {from:deployerAddress});
        await feesEscrow.registerManager(royaltyManager.address, {from:deployerAddress});
        
        // Testing manager to create fake data
        await escrow.registerManager(testManagerAddress, {from:deployerAddress})
        await feesEscrow.registerManager(testManagerAddress, {from:deployerAddress});

        // add token support
        await escrow.addSupportedTokens(rawrToken.address, {from:testManagerAddress});
    }

    beforeEach(async () => {
        escrow = await Erc20Escrow.new();
        await escrow.__Erc20Escrow_init({from: deployerAddress});
        feesEscrow = await ExchangeFeesEscrow.new();
        await feesEscrow.__ExchangeFeesEscrow_init(resolver.address, {from: deployerAddress});

        royaltyManager = await RoyaltyManager.new();
        await royaltyManager.__RoyaltyManager_init(resolver.address, {from: deployerAddress});
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

    it('Deposit Royalty', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();
        await RoyaltyManagerSetup();

        await rawrToken.approve(escrow.address, web3.utils.toWei('230', 'ether'), {from:playerAddress});
        await royaltyManager.methods['transferRoyalty(address,address,address,uint256)'](playerAddress, rawrToken.address, creatorAddress, web3.utils.toWei('200', 'ether'), {from: deployerAddress});

        var claimable = await escrow.claimableTokensByOwner(creatorAddress, {from: creatorAddress});
        assert.equal(
            claimable.amounts[0],
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );

        await royaltyManager.methods['transferPlatformFee(address,address,uint256)'](playerAddress, rawrToken.address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not sent to the fee pool"
        );

        assert.equal(
            await feesEscrow.totalFees(rawrToken.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not recorded in the fee pool"
        );
    });

    it('Transfer Royalty from escrow to royalty owner', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();
        await RoyaltyManagerSetup();

        // deposit 10000 RAWR tokens for Order 1 
        
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: testManagerAddress});

        await royaltyManager.methods['transferRoyalty(uint256,address,uint256)'](1, creatorAddress, web3.utils.toWei('200', 'ether'), {from: deployerAddress});
        await royaltyManager.methods['transferPlatformFee(address,uint256,uint256)'](rawrToken.address, 1, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        claimable = await escrow.claimableTokensByOwner(creatorAddress, {from: creatorAddress});
        assert.equal(
            claimable.amounts[0],
            web3.utils.toWei('200', 'ether').toString(),
            "Royalty was not deposited in Creator 1 address escrow."
        );
        
        // check if amounts were moved from the escrow for the order to claimable for the creator
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('9770', 'ether').toString(), 
            "Escrowed tokens for the Order was not updated."
        );
        
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not sent to the fee pool"
        );

        assert.equal(
            await feesEscrow.totalFees(rawrToken.address, {from: deployerAddress}),
            web3.utils.toWei('30', 'ether').toString(),
            "Exchange Fees not recorded in the fee pool"
        );
    });

    it('Get Royalties for an asset', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();
        await RoyaltyManagerSetup();
        
        var assetData = [content.address, 2];
        var results = await royaltyManager.payableRoyalties(assetData, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        assert.equal (
            results.receiver,
            creatorAddress, 
            "Incorrect receiver"
        );

        assert.equal (
            results.royaltyFee == web3.utils.toWei('200', 'ether').toString(), 
            true, 
            "Incorrect amount of royalty to pay"
        );
        
        assert.equal (
            results.remaining.toString() == web3.utils.toWei('9770', 'ether').toString(), 
            true, 
            "Incorrect amount remaining."
        );
    });

    it('Claim Royalties', async () => {
        await ContentContractSetup();
        await RawrTokenSetup();
        await RoyaltyManagerSetup();

        await rawrToken.approve(escrow.address, web3.utils.toWei('300', 'ether'), {from:playerAddress});
        await royaltyManager.methods['transferRoyalty(address,address,address,uint256)'](playerAddress, rawrToken.address, creatorAddress, web3.utils.toWei('200', 'ether'), {from: deployerAddress});

        // claim royalties
        await royaltyManager.claimRoyalties(creatorAddress, {from: deployerAddress});

        var claimable = await royaltyManager.claimableRoyalties(creatorAddress, {from: creatorAddress});
        assert.equal(
            claimable.amounts.length,
            0,
            "Royalty was not claimed yet."
        );
    });
});
