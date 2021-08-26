const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TagsManager = artifacts.require("TagsManager");
const ContractRegistry = artifacts.require("ContractRegistry");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Tags Manager Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        contract1Address,           // contract 1 address
        contract2Address,           // contract 2 address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var registry;
    var tagsManager;
    var tag1 = "TAG_1";
    var tag2 = "TAG_2";
    
    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 0, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []]
    ];

    beforeEach(async () => {
        // Create contracts in the correct order
        // Contract Registry is first
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();
        
        // Tags Manager is next
        tagsManager = await TagsManager.new();
        await tagsManager.__TagsManager_init(registry.address);

        // Content Contracts are next (Especially ContentManager)
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);

        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address, tagsManager.address, {from: deployerAddress});
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // Register the Content Manager with the Contract Registry to make sure it's part of the Rawrshak ecosystem
        await registry.registerContentManager(contentManager.address);
    });
    
    it('Verify TagsManager Interface Implementation', async () => {
        // TagsManager Interface
        assert.equal(
            await tagsManager.supportsInterface("0x0000001B"),
            true, 
            "The tags manager contract isn't a TagsManager implementation");
    });

    it('Add a Tag to a contract', async () => {
        await contentManager.addContractTags([tag1], {from: deployerAddress});
        await contentManager.addContractTags([tag2], {from: deployerAddress});
        
        var tag1Stored = await tagsManager.hasContractTag(content.address, tag1);
        var tag2Stored = await tagsManager.hasContractTag(content.address, tag2);
        assert.equal(
            tag1Stored && tag2Stored,
            true, 
            "The tags manager didn't save the contract under the tag correctly.");
    });

    it('Check Invalid tags', async () => {        
        await contentManager.addContractTags([tag1], {from: deployerAddress});
        
        // Check for a tag that doesn't exist
        assert.equal(
            await tagsManager.hasContractTag(content.address, "test-tag"), false, 
            "The tags manager returned true for a non-existent tag");

        // Check for an address that is not a contract
        assert.equal(
            await tagsManager.hasContractTag(contract1Address, "test-tag"), false, 
            "The tags manager returned true for a non-contract address");

        // Check for an address that doesn't have that tag 
        assert.equal(
            await tagsManager.hasContractTag(content.address, tag2), false, 
            "The tags manager returned true for content contract that doesn't have that tag.");
    });

    it('Remove a Tag from a contract', async () => {
        await contentManager.addContractTags([tag1], {from: deployerAddress});
        
        assert.equal(
            await tagsManager.hasContractTag(content.address, tag1),
            true, 
            "The tags manager didn't save the contract under the tag correctly.");
        
        await contentManager.removeContractTags([tag1], {from: deployerAddress});
        
        assert.equal(
            await tagsManager.hasContractTag(content.address, tag1),
            false, 
            "The tags manager didn't remove the contract under the tag correctly.");
    });

    it('Add multiple Tags to an asset', async () => {
        // Add 1 asset
        await contentManager.addAssetBatch(asset);

        // Add tags
        await contentManager.addAssetTags(1, [tag1, tag2], {from: deployerAddress});

        var tag1Stored = await tagsManager.hasAssetTag(content.address, 1, tag1);
        var tag2Stored = await tagsManager.hasAssetTag(content.address, 1, tag2);

        assert.equal(
            tag1Stored && tag2Stored,
            true, 
            "The tags manager didn't save the assets under the tag correctly.");
    });

    it('Check Invalid tags', async () => {      
        // Add 1 asset
        await contentManager.addAssetBatch(asset);
          
        await contentManager.addAssetTags(1, [tag1], {from: deployerAddress});
        
        // Check for a tag that doesn't exist
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 1, "test-tag"), false, 
            "The tags manager returned true for a non-existent tag");

        // Check for an address that is not a contract
        assert.equal(
            await tagsManager.hasAssetTag(contract1Address, 1, "test-tag"), false, 
            "The tags manager returned true for a non-contract address");

        // Check for an address that doesn't have that tag 
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 1, tag2), false, 
            "The tags manager returned true for an asset that doesn't have that tag.");

        // Check for an id doesn't have the tag
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 2, tag1), false, 
            "The tags manager returned true for an asset that has no tags");
    });

    it('Remove a Tag from an asset', async () => {
        // Add 1 asset
        await contentManager.addAssetBatch(asset);

        // Add tags
        await contentManager.addAssetTags(1, [tag1, tag2], {from: deployerAddress});
        
        // Tag on asset exists
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 1, tag2),
            true, 
            "The tags manager didn't save the assets under the tag correctly.");
        
        // Remove Tag
        await contentManager.removeAssetTags(1, [tag1], {from: deployerAddress});
        
        // Check Tag 1 still exists for asset, but not tag 2
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 1, tag1),
            false, 
            "The tags manager didn't remove the asset under the tag correctly.");
        
        assert.equal(
            await tagsManager.hasAssetTag(content.address, 1, tag2),
            true, 
            "The tags manager removed the wrong asset under the tag.");
    });
});
