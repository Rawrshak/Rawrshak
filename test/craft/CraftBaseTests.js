const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const TestCraftBase = artifacts.require("TestCraftBase");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const OrderbookManager = artifacts.require("OrderbookManager");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const Exchange = artifacts.require("Exchange");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Craft Base Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
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
        [1, "CID-1", 0, []],
        [2, "CID-2", 100, []],
        [3, "CID-3", 0, []],
        [4, "CID-4", 0, []],
        [5, "CID-5", 0, []],
        [6, "CID-6", 10000, []],
        [7, "CID-7", 1000, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    var craftBase;
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

        // give crafting system approval
        var approvalPair = [[contentManager.address, true]];
        await contentManager.setSystemApproval(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        nftAssetData = [content.address, 2];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2, 3, 4, 5], [10, 10, 10, 10, 10]];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        // var mintData = [player2Address, [1, 2], [10, 10]];
        // await contentManager.mintBatch(mintData, {from: deployerAddress});

        // Set contract royalties
        var assetRoyalty = [[creator1Address, 200]];
        await contentManager.setContractRoyalties(assetRoyalty);

        craftBase = await TestCraftBase.new();
        await craftBase.__TestCraftBase_init(1000);
        
        manager_role = await craftBase.MANAGER_ROLE();
        
        var approvalPair = [[craftBase.address, true]];
        await contentManager.setSystemApproval(approvalPair);

        TruffleAssert.eventEmitted(
            await craftBase.registerManager(managerAddress, {from: deployerAddress}),
            'ManagerRegistered'
        );

    });

    // it('Check if CraftBase Test Contract was deployed properly', async () => {
    //     assert.equal(
    //         craftBase.address != 0x0,
    //         true,
    //         "CraftBase Test Contract was not deployed properly.");
    // });

    it('Register Manager and check permissions', async () => {
        TruffleAssert.eventEmitted(
            await craftBase.registerManager(testManagerAddress, {from: deployerAddress}),
            'ManagerRegistered'
        );

        assert.equal(
            await craftBase.hasRole(
                manager_role,
                testManagerAddress),
            true, 
            "manager address should have the manager role");

        assert.equal(
            await craftBase.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer address should not have the manager role");
    });

    it('Pause and unpause the contract', async () => {
        await craftBase.managerSetPause(false, {from: managerAddress});

        assert.equal(
            await craftBase.paused(),
            false, 
            "Craft Base contract should be not be paused.");

        await craftBase.managerSetPause(true, {from: managerAddress});
    
        assert.equal(
            await craftBase.paused(),
            true, 
            "Craft Base contract should be paused.");
    });

    it('Register Content Address', async () => {
        TruffleAssert.eventEmitted(
            await craftBase.registerContent(content.address, {from: managerAddress}),
            'ContentRegistered'
        );

        assert.equal(
            await craftBase.isContentRegistered(content.address),
            true, 
            "Content Contract was ot registered correctly");

        assert.equal(
            await craftBase.hasRole(
                manager_role,
                managerAddress),
            true, 
            "manager address should have the manager role");
    });

    it('Invalid Content Address', async () => {
        TruffleAssert.fails(
            craftBase.registerContent(contentStorage.address, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        TruffleAssert.fails(
            craftBase.registerContent(testManagerAddress, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await craftBase.managerSetPause(false, {from: managerAddress});

        TruffleAssert.fails(
            craftBase.registerContent(content.address, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
