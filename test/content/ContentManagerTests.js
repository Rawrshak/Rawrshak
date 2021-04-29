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
        [1, "ipfs:/CID-1", 0, [[deployerAddress, 200]]],
        [2, "ipfs:/CID-2", 100, []]
    ];

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
        
        await contentStorage.userApprove(contentManager.address, true);

        // give crafting system approval
        var approvalPair = [[contentManager.address, true], [craftingSystemAddress, true]];
        await contentManager.registerSystem(approvalPair);

        // Add 1 asset
        await contentManager.addAssetBatch(asset);
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
            [3, "ipfs:/CID-3", 1000, []]
        ];
        
        await contentManager.addAssetBatch(newAssets);
        await contentStorage.userApprove(playerAddress, true);

        var mintData = [playerAddress, [3], [10]];
        await content.mintBatch(mintData, {from: craftingSystemAddress});

        assert.equal(
            await content.tokenUri(3),
            "ipfs:/3", 
            "New asset wasn't added.");
        assert.equal(
            await content.methods['tokenDataUri(uint256,uint256)'](3, 0, {from: playerAddress}),
            "ipfs:/CID-3", 
            "New asset wasn't added.");
    });

    it('Set operators for System Approval', async () => {        
        assert.equal(
            await content.isSystemOperator(lootboxSystemAddress, {from: contentManager.address}),
            false,
            "lootbox system not should be approved yet.");

        var lootboxApprovalPair = [[lootboxSystemAddress, true]];
        await contentManager.registerSystem(lootboxApprovalPair);

        assert.equal(
            await content.isSystemOperator(lootboxSystemAddress, {from: contentManager.address}),
            true,
            "lootbox system should be approved.");
    });

    it('Set Token Prefix', async () => {
        assert.equal(
            await content.tokenUri(1),
            "ipfs:/1", 
            "Token Uri Prefix wasn't set properly.");

        await contentManager.setTokenUriPrefix("ipns:/");
        
        assert.equal(
            await content.tokenUri(1),
            "ipns:/1", 
            "Token Uri Prefix wasn't set properly.");
    });

    it('Set Token URI', async () => {
        var assetUri = [
            [2, "ipfs:/CID-2-v1"]
        ];
        await contentManager.setTokenDataUriBatch(assetUri);
        await contentStorage.userApprove(playerAddress, true);

        var mintData = [playerAddress, [2], [1]];
        await content.mintBatch(mintData, {from: craftingSystemAddress});

        assert.equal(
            await content.methods['tokenDataUri(uint256,uint256)'](2, 0, {from: playerAddress}),
            "ipfs:/CID-2",
            "Token 2 incorrect uri for previous version.");
        
        assert.equal(
            await content.methods['tokenDataUri(uint256,uint256)'](2, 1, {from: playerAddress}),
            "ipfs:/CID-2-v1",
            "Token 2 incorrect uri for latest version.");
        
        assert.equal(
            await content.methods['tokenDataUri(uint256,uint256)'](2, 2, {from: playerAddress}),
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
