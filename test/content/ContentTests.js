const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const TruffleAssert = require("truffle-assertions");
const { sign } = require("../mint");

contract('Content Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var content;
    var contentStorage;
    var systemsRegistry;
    var asset = [
        [1, "ipfs:/CID-1", 0, [[deployerAddress, 200]]],
        [2, "ipfs:/CID-2", 100, []],
    ];

    beforeEach(async () => {
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);

        // give crafting system approval
        var approvalPair = [[deployerAddress, true], [craftingSystemAddress, true]];
        await systemsRegistry.registerSystems(approvalPair);

        // Add 1 asset        
        await contentStorage.addAssetBatch(asset);
    });

    it('Check Content proper deployment', async () => {
        // Check initializer parameters
        assert.equal(
            await content.name(),
            "Test Content Contract",
            "Contract name is incorrect.");
        assert.equal(
            await content.symbol(),
            "TEST",
            "Contract symbol is incorrect.");
        assert.equal(
            await content.uri(0),
            "ipfs:/contract-uri",
            "Contract uri is incorrect.");
        assert.equal(
            await content.dataStorage(),
            contentStorage.address,
            "Contract uri is incorrect.");
        assert.equal(
            await content.systemsRegistry(),
            systemsRegistry.address,
            "Contract uri is incorrect.");
    });
    
    it('Verify ERC1155 Implementation', async () => {
        // ERC1155 Interface
        assert.equal(
            await content.supportsInterface("0xd9b67a26"),
            true, 
            "The content contract isn't an ERC1155 implementation");
    });

    it('Check Supply', async () => {
        var results = await content.getSupplyInfo(1);
        assert.equal(results.supply, 0, "Asset 1 incorrect supply");
        assert.equal(results.maxSupply, 0, "Asset 1 incorrect max supply");
        
        results = await content.getSupplyInfo(2);
        assert.equal(results.supply, 0, "Asset 2 incorrect supply");
        assert.equal(results.maxSupply, 100, "Asset 2 incorrect max supply");
    });

    // CreateData
    // {
    //     tokenId,
    //     dataUri,
    //     maxSupply,
    //     [
    //         {
    //             account,
    //             bps
    //         }
    //     ]
    // }

    it('Trigger Content Storage and Systems Register Functions', async () => {
        // Test token uri
        // Note: we use content.methods['function()']() below because it hiddenTokenUri() is an
        //       overloaded function
        
        const signature = await sign(playerAddress, [1], [1], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1], [1], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});

        assert.equal(
            await content.methods['hiddenTokenUri(uint256,uint256)'](1, 0, {from: playerAddress}),
            "ipfs:/CID-1",
            "Token 1 uri is incorrect.");
        
        // test royalties
        var fees = await content.getRoyalties(1);
        assert.equal(
            fees[0].account == deployerAddress && fees[0].bps == 200,
            true,
            "Token 1 royalties are incorrect");

        // test not approved 
        assert.equal(
            await systemsRegistry.isSystemOperatorApproved(playerAddress, craftingSystemAddress, {from: playerAddress}),
            false,
            "Crafting System Address does not have the correct permissions.");

        await content.approveAllSystems(true, {from:playerAddress});

        // test approval 
        assert.equal(
            await systemsRegistry.isSystemOperatorApproved(playerAddress, craftingSystemAddress, {from: playerAddress}),
            true,
            "Crafting System Address does not have the correct permissions.");
    });

    it('Add Assets', async () => {
        // invalid add because asset already exists
        var newAssets = [
            [3, "CID-3", 1000, []]
        ];
        
        TruffleAssert.eventEmitted(await contentStorage.addAssetBatch(newAssets), 'AssetsAdded');
        var supplyInfo = await content.getSupplyInfo(3, {from: playerAddress});
        assert.equal(supplyInfo.supply, 0, "Asset 3 incorrect supply");
        assert.equal(supplyInfo.maxSupply, 1000, "Asset 3 incorrect max supply");
    });

    // MintData
    // {
    //     to,
    //     [
    //         tokenId,
    //         tokenId
    //     ],
    //     [
    //         amount,
    //         amount
    //     ]
    // }

    it('Mint Assets', async () => {
        const signature = await sign(playerAddress, [1, 2], [10, 1], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1, 2], [10, 1], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});
        
        var supplyInfo = await content.getSupplyInfo(1, {from: playerAddress});
        assert.equal(supplyInfo.supply, 10, "Asset 1 incorrect supply");
        supplyInfo = await content.getSupplyInfo(2, {from: playerAddress});
        assert.equal(supplyInfo.supply, 1, "Asset 2 incorrect supply");

        var balance = await content.balanceOf(playerAddress, 1);
        assert.equal(balance.valueOf().toString(), "10", "Player doesn't have the minted assets.");
    });

    it('Mint data length input mismatch', async () => {
        const signature = await sign(playerAddress, [1, 2], [10], 1, craftingSystemAddress, await content.systemsRegistry());
        var invalidLengthData = [playerAddress, [1, 2], [10], 1, craftingSystemAddress, signature];
        await TruffleAssert.fails(
            content.mintBatch(invalidLengthData, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Mint invalid token id', async () => {
        const signature = await sign(playerAddress, [4, 5], [1, 1], 1, craftingSystemAddress, await content.systemsRegistry());
        var invalidTokenIdData = [playerAddress, [4, 5], [1, 1], 1, craftingSystemAddress, signature];
        await TruffleAssert.fails(
            content.mintBatch(invalidTokenIdData, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Mint invalid supply', async () => {
        const signature = await sign(playerAddress, [2], [300], 1, craftingSystemAddress, await content.systemsRegistry());
        var invalidSupplyData = [playerAddress, [2], [300], 1, craftingSystemAddress, signature];
        await TruffleAssert.fails(
            content.mintBatch(invalidSupplyData, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Burn Assets', async () => {
        await content.approveAllSystems(true, {from:playerAddress});

        const signature = await sign(playerAddress, [1], [10], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1], [10], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});

        var burnData = [playerAddress, [1], [5]];
        await content.burnBatch(burnData, {from: playerAddress});
        assert.equal((await content.getSupplyInfo(1)).supply, 5, "Asset 1 incorrect supply");

        await content.burnBatch(burnData, {from: craftingSystemAddress});
        assert.equal((await content.getSupplyInfo(1)).supply, 0, "Asset 1 incorrect supply");
        
        var balance = await content.balanceOf(playerAddress, 1);
        assert.equal(balance.valueOf().toString(), "0", "Player still has the burned assets.");
    });
    
    it('Invalid burns', async () => {
        await content.approveAllSystems(true, {from:playerAddress});

        const signature = await sign(playerAddress, [1], [10], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1], [10], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});

        var burnData = [playerAddress, [1], [5]];
        await TruffleAssert.fails(
            content.burnBatch(burnData, {from: lootboxSystemAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            content.burnBatch(burnData, {from: player2Address}),
            TruffleAssert.ErrorType.REVERT
        );
        
        var balance = await content.balanceOf(playerAddress, 1);
        assert.equal(balance.valueOf().toString(), "10", "Player's assets were incorrectly burned.");
    });

    it('Transfer Assets', async () => {
        const signature = await sign(playerAddress, [1], [10], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1], [10], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});

        TruffleAssert.eventEmitted(
            await content.safeTransferFrom(playerAddress, player2Address, 1, 1, 0, {from:playerAddress}),
            'TransferSingle'
        );
    });

    it('Invalid Transfer Assets', async () => {
        const signature = await sign(playerAddress, [1], [10], 1, craftingSystemAddress, await content.systemsRegistry());
        var mintData = [playerAddress, [1], [10], 1, craftingSystemAddress, signature];
        await content.mintBatch(mintData, {from: playerAddress});
        
        await TruffleAssert.fails(
            content.safeTransferFrom(playerAddress, player2Address, 1, 1, 0, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
