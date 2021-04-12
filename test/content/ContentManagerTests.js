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
        [2, "CID-2", 100, []]
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

        // give crafting system approval
        await contentManager.setSystemApproval(approvalPair);
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
            await contentManager.supportsInterface("0x00000003"),
            true, 
            "the contract doesn't support the ContentManager interface");
    });

    it('Add Assets', async () => {
        // Add 1 asset
        var newAssets = [
            [3, "CID-3", 1000, []]
        ];
        
        await contentManager.addAssetBatch(newAssets);
        assert.equal(
            await content.tokenUri(3, 0),
            "ipfs:/CID-3", 
            "New asset wasn't added.");
    });

    it('Set Contract Uri', async () => {
        await contentManager.setContractUri("ipfs:/contract-uri.json");
        
        assert.equal(
            await content.uri(0),
            "ipfs:/contract-uri.json", 
            "Contract Uri was not set properly");
    });

    it('Set operators for System Approval', async () => {        
        assert.equal(
            await content.isApprovedForAll(playerAddress, lootboxSystemAddress, {from: lootboxSystemAddress}),
            false,
            "lootbox system not should be approved yet.");

        var lootboxApprovalPair = [[lootboxSystemAddress, true]];
        await contentManager.setSystemApproval(lootboxApprovalPair);
        assert.equal(
            await content.isApprovedForAll(playerAddress, lootboxSystemAddress, {from: lootboxSystemAddress}),
            true,
            "lootbox system should be approved.");
    });

    it('Set Token Prefix', async () => {
        assert.equal(
            await content.tokenUri(1, 0),
            "ipfs:/CID-1", 
            "Token Uri Prefix wasn't set properly.");

        await contentManager.setTokenUriPrefix("ipns:/");
        
        assert.equal(
            await content.tokenUri(1, 0),
            "ipns:/CID-1", 
            "Token Uri Prefix wasn't set properly.");
    });

    it('Set Token URI', async () => {
        var assetUri = [
            [2, "CID-2-v1"]
        ];
        await contentManager.setTokenUriBatch(assetUri);
        
        assert.equal(
            await content.tokenUri(2, 0),
            "ipfs:/CID-2",
            "Token 2 incorrect uri for previous version.");
        
        assert.equal(
            await content.tokenUri(2, 1),
            "ipfs:/CID-2-v1",
            "Token 2 incorrect uri for latest version.");
        
        assert.equal(
            await content.tokenUri(2, 2),
            "ipfs:/CID-2-v1",
            "Token 2 invalid version returns uri for latest version.");
    });

    it('Set Token Contract Royalties', async () => {
        var assetRoyalty = [[deployerAddress, 200], [deployerAltAddress, 200]];
        await contentManager.setContractRoyalties(assetRoyalty);

        var royalties = await content.getRoyalties(2);
        assert.equal(royalties.length, 2, "Incorrect contract royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect contract royalty account 1");
        assert.equal(royalties[0].bps, 200, "Incorrect contract royalty bps 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect contract royalty account 2");
        assert.equal(royalties[1].bps, 200, "Incorrect contract royalty bps 2");
    });

    it('Set Token Royalties', async () => {
        var assetRoyalty = [[1, [[deployerAddress, 200], [deployerAltAddress, 200]]]];
        await contentManager.setTokenRoyaltiesBatch(assetRoyalty);

        var royalties = await content.getRoyalties(1);
        assert.equal(royalties.length, 2, "Incorrect royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect royalty account 1");
        assert.equal(royalties[0].bps, 200, "Incorrect royalty bps 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect royalty account 2");
        assert.equal(royalties[1].bps, 200, "Incorrect royalty bps 2");
    });
});
