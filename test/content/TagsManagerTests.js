const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TagsManager = artifacts.require("TagsManager");
const TruffleAssert = require("truffle-assertions");

contract('HasContractUri Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        contract1Address,           // contract 1 address
        contract2Address,           // contract 2 address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var tagsManager;
    var tag1 = "TAG_1";
    var tag2 = "TAG_2";

    beforeEach(async () => {
        tagsManager = await TagsManager.new();
        await tagsManager.__TagsManager_init();
    });
    
    it('Verify TagsManager Interface Implementation', async () => {
        // TagsManager Interface
        assert.equal(
            await tagsManager.supportsInterface("0x0000001B"),
            true, 
            "The tags manager contract isn't a TagsManager implementation");
    });

    it('Add a Tag to a contract', async () => {
        TruffleAssert.eventEmitted(
            await tagsManager.addContractTags(contract1Address, [tag1], {from: deployerAddress}),
            'ContractTagsAdded'
        );
        
        TruffleAssert.eventEmitted(
            await tagsManager.addContractTags(contract1Address, [tag2], {from: deployerAddress}),
            'ContractTagsAdded'
        );

        var tag1Stored = await tagsManager.hasContractTag(contract1Address, tag1);
        var tag2Stored = await tagsManager.hasContractTag(contract1Address, tag2);
        assert.equal(
            tag1Stored && tag2Stored,
            true, 
            "The tags manager didn't save the contract under the tag correctly.");
    });

    it('Remove a Tag from a contract', async () => {
        TruffleAssert.eventEmitted(
            await tagsManager.addContractTags(contract1Address, [tag1], {from: deployerAddress}),
            'ContractTagsAdded'
        );
        
        assert.equal(
            await tagsManager.hasContractTag(contract1Address, tag1),
            true, 
            "The tags manager didn't save the contract under the tag correctly.");
        
        TruffleAssert.eventEmitted(
            await tagsManager.removeContractTags(contract1Address, [tag1], {from: deployerAddress}),
            'ContractTagsRemoved'
        );
        
        assert.equal(
            await tagsManager.hasContractTag(contract1Address, tag1),
            false, 
            "The tags manager didn't remove the contract under the tag correctly.");
    });

    it('Add multiple Tags to an asset', async () => {
        TruffleAssert.eventEmitted(
            await tagsManager.addAssetTags(contract1Address, 1, [tag1, tag2], {from: deployerAddress}),
            'AssetTagsAdded'
        );

        var tag1Stored = await tagsManager.hasAssetTag(contract1Address, 1, tag1);
        var tag2Stored = await tagsManager.hasAssetTag(contract1Address, 1, tag2);

        assert.equal(
            tag1Stored && tag2Stored,
            true, 
            "The tags manager didn't save the assets under the tag correctly.");
    });

    it('Remove a Tag from an asset', async () => {
        TruffleAssert.eventEmitted(
            await tagsManager.addAssetTags(contract1Address, 1, [tag1, tag2], {from: deployerAddress}),
            'AssetTagsAdded'
        );
        
        TruffleAssert.eventEmitted(
            await tagsManager.removeAssetTags(contract1Address, 1, [tag1], {from: deployerAddress}),
            'AssetTagsRemoved'
        );
        
        assert.equal(
            await tagsManager.hasAssetTag(contract1Address, 1, tag1),
            false, 
            "The tags manager didn't remove the asset under the tag correctly.");
        
        assert.equal(
            await tagsManager.hasAssetTag(contract1Address, 1, tag2),
            true, 
            "The tags manager removed the wrong asset under the tag.");
    });
});
