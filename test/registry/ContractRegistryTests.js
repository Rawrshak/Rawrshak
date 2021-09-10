const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const ContractRegistry = artifacts.require("ContractRegistry");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const Craft = artifacts.require("Craft");
const Salvage = artifacts.require("Salvage");
const TruffleAssert = require("truffle-assertions");

contract('Contract Registry Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        contract1Address,           // contract 1 address
        contract2Address,           // contract 2 address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var registry;
    var accessControlManager;  
    var contentStorage;  
    var content;
    var contentManager;
    var craft;
    var salvage;

    beforeEach(async () => {
        // Create contracts in the correct order
        // Contract Registry is first
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();

        // Content Contracts are next (Especially ContentManager)
        accessControlManager = await AccessControlManager.new();
        await accessControlManager.__AccessControlManager_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, accessControlManager.address);
        await contentStorage.setParent(content.address);

        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, accessControlManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.grantRole(await accessControlManager.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.setParent(content.address);

        craft = await Craft.new();
        await craft.__Craft_init(1000);
        
        salvage = await Salvage.new();
        await salvage.__Salvage_init(1000);
        
        // registered manager
        await craft.registerManager(deployerAddress, {from: deployerAddress});
        await salvage.registerManager(deployerAddress, {from: deployerAddress});
    });
    
    it('Verify ContractRegistry Interface Implementation', async () => {
        // Contract Registry Interface
        assert.equal(
            await registry.supportsInterface("0x498D4CA2"),
            true, 
            "The contract isn't a ContractRegistry implementation");
    });
    
    it('Register Game Developer Contracts', async () => {
        // Register the Content Manager with the Contract Registry to make sure it's part of the Rawrshak ecosystem
        await registry.registerContentManager(contentManager.address);
        await registry.registerCraft(craft.address);
        await registry.registerSalvage(salvage.address);

        // Test registered addresses
        var isContentManagerRegistered = await registry.isRegistered(contentManager.address);
        var isCraftRegistered = await registry.isRegistered(craft.address);
        var isSalvageRegstered = await registry.isRegistered(salvage.address);

        assert.equal(
            isContentManagerRegistered && isCraftRegistered && isSalvageRegstered,
            true, 
            "Game Developer contracts were not registered properly");
            
    });

});
