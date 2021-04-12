const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const TruffleAssert = require("truffle-assertions");

contract('Content Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var contentManager;
    var content;
    var contentStorage;
    var asset = [
        [1, "CID-1", 0, [[deployerAddress, 200]]],
        [2, "CID-2", 100, []],
    ];
    var approvalPair = [[craftingSystemAddress, true]];

    beforeEach(async () => {
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address);
        contentStorage.setParent(content.address);

        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // Add 1 asset
        await contentManager.addAssetBatch(asset);

        // // give crafting system approval
        // await contentStorage.setSystemApproval(approvalPair);
    });

    it('Check Content Manager proper deployment', async () => {
        assert.equal(await contentManager.content(), content.address, "content contract is incorrect");

        assert.equal(await content.owner(), contentManager.address, "Content Manager doesn't own the content contract.")
        assert.equal(
            await contentStorage.hasRole(await contentStorage.OWNER_ROLE(), deployerAddress),
            true,
            "Content Storage doesn't have the Owner Role."
        )
    });

    it('Check Supported interfaces', async () => {
        // Content Storage interface
        assert.equal(
            await contentStorage.supportsInterface("0x00000003"),
            true, 
            "the contract doesn't support the ContentStorage interface");
    });

    it('Add Assets', async () => {
        // Add 1 asset
        var newAssets = [
            [3, "CID-3", 1000, []]
        ];
        
        TruffleAssert.eventEmitted(await content.addAssetBatch(newAssets), 'AssetsAdded');
    });

    it('Set Contract Uri', async () => {
        TruffleAssert.eventEmitted(await content.setContractUri("ipfs:/contract-uri.json"), 'AssetsAdded');
    });

    it('Set operators for System Approval', async () => {
        TruffleAssert.eventEmitted
            (await content.setSystemApproval(content.lootboxSystemAddress), 'AssetsAdded');
    });

    it('Set Token Prefix', async () => {

    });

    it('Set Token URI', async () => {

    });

    it('Set Token Contract Royalties', async () => {

    });

    it('Set Token Royalties', async () => {

    });
});
