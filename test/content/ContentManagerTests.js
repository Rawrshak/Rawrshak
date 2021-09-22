const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const ContentFactory = artifacts.require("ContentFactory");
const { constants } = require('@openzeppelin/test-helpers');

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
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, 20000]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []]
    ];

    beforeEach(async () => {
        accessControlManagerImpl = await AccessControlManager.new();
        contentImpl = await Content.new();
        contentStorageImpl = await ContentStorage.new();
        contentManagerImpl = await ContentManager.new();
        contentFactory = await ContentFactory.new();

        // Initialize Clone Factory
        await contentFactory.__ContentFactory_init(
            contentImpl.address,
            contentManagerImpl.address,
            contentStorageImpl.address,
            accessControlManagerImpl.address);

        // deploy contracts
        var result = await contentFactory.createContracts(
            [[deployerAddress, 10000]],
            "arweave.net/tx-contract-uri");

        // To figure out which log contains the ContractDeployed event
        // console.log(result.logs);
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);

        // give crafting system approval
        var approvalPair = [[craftingSystemAddress, true]];
        await contentManager.registerOperators(approvalPair);

        // Add 1 asset
        await contentManager.addAssetBatch(asset);
    });

    it('Check Content Manager proper deployment', async () => {
        assert.equal(await contentManager.content(), content.address, "content contract is incorrect");
    });

    it('Check Supported interfaces', async () => {
        // Content Storage interface
        assert.equal(
            await contentManager.supportsInterface("0xEAD82167"),
            true, 
            "the contract doesn't support the ContentManager interface");
    });

    it('Add Assets', async () => {
        // Add 1 asset
        var newAssets = [
            [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 1000, []]
        ];
        
        await contentManager.addAssetBatch(newAssets);

        // const signature = await sign(playerAddress, [1], [1], 1, null, content.address);
        var mintData = [playerAddress, [3], [10], 1, constants.ZERO_ADDRESS, []];
        await content.mintBatch(mintData, {from: craftingSystemAddress});

        assert.equal(
            await content.uri(3),
            "arweave.net/tx/public-uri-3", 
            "New asset wasn't added.");
    });

    it('Set Token URI', async () => {
        var assetUri = [
            [2, "arweave.net/tx/public-uri-2-v1"]
        ];
        await contentManager.setPublicUriBatch(assetUri);

        var mintData = [playerAddress, [2], [1], 1, constants.ZERO_ADDRESS, []];
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
        var assetRoyalty = [[deployerAddress, 20000], [deployerAltAddress, 20000]];
        await contentManager.setContractRoyalty(assetRoyalty);

        var royalties = await content.getRoyalties(2);
        assert.equal(royalties.length, 2, "Incorrect contract royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect contract royalty account 1");
        assert.equal(royalties[0].rate, 20000, "Incorrect contract royalty rate 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect contract royalty account 2");
        assert.equal(royalties[1].rate, 20000, "Incorrect contract royalty rate 2");
    });

    it('Set Token Royalties', async () => {
        var assetRoyalty = [[1, [[deployerAddress, 20000], [deployerAltAddress, 20000]]]];
        await contentManager.setTokenRoyaltiesBatch(assetRoyalty);

        var royalties = await content.getRoyalties(1);
        assert.equal(royalties.length, 2, "Incorrect royalties length");
        assert.equal(royalties[0].account, deployerAddress, "Incorrect royalty account 1");
        assert.equal(royalties[0].rate, 20000, "Incorrect royalty rate 1");
        assert.equal(royalties[1].account, deployerAltAddress, "Incorrect royalty account 2");
        assert.equal(royalties[1].rate, 20000, "Incorrect royalty rate 2");
    });
});
