const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const TruffleAssert = require("truffle-assertions");
// const { sign } = require("../mint");

contract('Content Manager Contract Tests', (accounts) => {
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
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 0, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []]
    ];
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    beforeEach(async () => {
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);

        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        var approvalPair = [[craftingSystemAddress, true]];
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
            [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 1000, []]
        ];
        
        await contentManager.addAssetBatch(newAssets);

        // const signature = await sign(playerAddress, [1], [1], 1, null, await content.systemsRegistry());
        var mintData = [playerAddress, [3], [10], 1, zeroAddress, []];
        await content.mintBatch(mintData, {from: craftingSystemAddress});

        assert.equal(
            await content.uri(3),
            "arweave.net/tx/public-uri-3", 
            "New asset wasn't added.");
        
        // Todo: Move this hiddenUri() test to the ContentWithHiddenData contract tests once added
        // assert.equal(
        //     await content.methods['hiddenUri(uint256,uint256)'](3, 0, {from: playerAddress}),
        //     "arweave.net/tx/private-uri-3", 
        //     "New asset wasn't added.");
    });

    it('Set operators for System Approval', async () => {        
        await content.approveAllSystems(true, {from: playerAddress});

        assert.equal(
            await systemsRegistry.isOperatorApproved(playerAddress, lootboxSystemAddress, {from: playerAddress}),
            false,
            "lootbox system not should be approved yet.");

        var lootboxApprovalPair = [[lootboxSystemAddress, true]];
        await contentManager.registerSystem(lootboxApprovalPair);

        assert.equal(
            await systemsRegistry.isOperatorApproved(playerAddress, lootboxSystemAddress, {from: playerAddress}),
            true,
            "lootbox system should be approved.");
    });

    it('Set Token URI', async () => {
        var assetUri = [
            [2, "arweave.net/tx/public-uri-2-v1"]
        ];
        await contentManager.setPublicUriBatch(assetUri);

        var mintData = [playerAddress, [2], [1], 1, zeroAddress, []];
        await content.mintBatch(mintData, {from: craftingSystemAddress});

        assert.equal(
            await content.methods['uri(uint256,uint256)'](2, 0, {from: playerAddress}),
            "arweave.net/tx/public-uri-2",
            "Token 2 incorrect uri for previous version.");
        
        assert.equal(
            await content.methods['uri(uint256,uint256)'](2, 1, {from: playerAddress}),
            "arweave.net/tx/public-uri-2-v1",
            "Token 2 incorrect uri for latest version.");
        
        assert.equal(
            await content.methods['uri(uint256,uint256)'](2, 2, {from: playerAddress}),
            "arweave.net/tx/public-uri-2-v1",
            "Token 2 invalid version returns uri for latest version.");
    });

    it('Set Token Contract Royalties', async () => {
        var assetRoyalty = [[deployerAddress, web3.utils.toWei('0.02', 'ether')], [deployerAltAddress, web3.utils.toWei('0.02', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty);

        var royalties = await content.getRoyalties(2);
        assert.equal(royalties.length, 2, "Incorrect contract royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect contract royalty account 1");
        assert.equal(royalties[0].rate, web3.utils.toWei('0.02', 'ether'), "Incorrect contract royalty rate 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect contract royalty account 2");
        assert.equal(royalties[1].rate, web3.utils.toWei('0.02', 'ether'), "Incorrect contract royalty rate 2");
    });

    it('Set Token Royalties', async () => {
        var assetRoyalty = [[1, [[deployerAddress, web3.utils.toWei('0.02', 'ether')], [deployerAltAddress, web3.utils.toWei('0.02', 'ether')]]]];
        await contentManager.setTokenRoyaltiesBatch(assetRoyalty);

        var royalties = await content.getRoyalties(1);
        assert.equal(royalties.length, 2, "Incorrect royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect royalty account 1");
        assert.equal(royalties[0].rate, web3.utils.toWei('0.02', 'ether'), "Incorrect royalty rate 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect royalty account 2");
        assert.equal(royalties[1].rate, web3.utils.toWei('0.02', 'ether'), "Incorrect royalty rate 2");
    });
});
