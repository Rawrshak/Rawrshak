const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const TestCraftBase = artifacts.require("TestCraftBase");
const TruffleAssert = require("truffle-assertions");

contract('Craft Base Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var craftBase;
    var manager_role;

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

        craftBase = await TestCraftBase.new();
        await craftBase.__TestCraftBase_init(1000);
        
        manager_role = await craftBase.MANAGER_ROLE();
        
        // Register the craftbase as a system on the content contract
        var approvalPair = [[craftBase.address, true]];
        await contentManager.registerSystem(approvalPair, {from: deployerAddress});

        // registered manager
        await craftBase.registerManager(managerAddress, {from: deployerAddress});
    });

    it('Check if CraftBase Test Contract was deployed properly', async () => {
        assert.equal(
            craftBase.address != 0x0,
            true,
            "CraftBase Test Contract was not deployed properly.");
    });

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
            await craftBase.registerContent(await contentManager.content(), {from: managerAddress}),
            'ContentRegistered'
        );

        assert.equal(
            await craftBase.isContentRegistered(await contentManager.content()),
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
            craftBase.registerContent((await contentManager.content()).address, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
