const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
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
    var content;
    var contentStorage;
    var asset = [
        [1, "CID-1", 0, [[deployerAddress, 200]]],
        [2, "CID-2", 100, []],
    ];

    beforeEach(async () => {
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address);
        contentStorage.setParent(content.address);

        // give crafting system approval
        var approvalPair = [[deployerAddress, true], [craftingSystemAddress, true]];
        await contentStorage.setSystemApproval(approvalPair);

        // Add 1 asset        
        await content.addAssetBatch(asset);
        await contentStorage.addAssetBatch(asset);

        // give crafting system approval
        await contentStorage.setSystemApproval(approvalPair);
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
    });
    
    it('Verify ERC1155 Implementation', async () => {
        // ERC1155 Interface
        assert.equal(
            await content.supportsInterface("0xd9b67a26"),
            true, 
            "The content contract isn't an ERC1155 implementation");
    });
    

    it('Check Supply', async () => {
        assert.equal(await content.supply(1), 0, "Asset 1 incorrect supply");
        assert.equal(await content.maxSupply(1), 0, "Asset 1 incorrect max supply");
        assert.equal(await content.supply(2), 0, "Asset 1 incorrect supply");
        assert.equal(await content.maxSupply(2), 100, "Asset 1 incorrect max supply");
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

    it('Trigger Content Storage Functions', async () => {
        // Test token uri
        // Note: we use content.methods['function()']() below because it tokenDataUri() is an
        //       overloaded function
        assert.equal(
            await content.methods['tokenDataUri(uint256,uint256)'](1, 0),
            "ipfs:/CID-1",
            "Token 1 uri is incorrect.");
        
        // test royalties
        var fees = await content.getRoyalties(1);
        assert.equal(
            fees[0].account == deployerAddress && fees[0].bps == 200,
            true,
            "Token 1 royalties are incorrect");

        // test approval 
        assert.equal(
            await contentStorage.isSystemOperator(craftingSystemAddress, {from: deployerAddress}),
            true,
            "Crafting System Address does not have the correct permissions.");
    });

    it('Add Assets fails', async () => {
        // invalid add because asset already exists
        var newAssets = [
            [2, "CID-2v", 0, [[deployerAddress, 300]]]
        ];

        await TruffleAssert.fails(
            content.addAssetBatch(newAssets),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Add Assets', async () => {
        // invalid add because asset already exists
        var newAssets = [
            [3, "CID-3", 1000, []]
        ];
        
        TruffleAssert.eventEmitted(await content.addAssetBatch(newAssets), 'AssetsAdded');
        assert.equal(await content.supply(3), 0, "Asset 3 incorrect supply");
        assert.equal(await content.maxSupply(3), 1000, "Asset 3 incorrect max supply");
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
        var mintData = [playerAddress, [1, 2], [10, 1]];
        await content.mintBatch(mintData, {from: deployerAddress});
        
        assert.equal(await content.supply(1), 10, "Asset 1 incorrect supply");
        assert.equal(await content.supply(2), 1, "Asset 2 incorrect supply");

        var balance = await content.balanceOf(playerAddress, 1);
        assert.equal(balance.valueOf().toString(), "10", "Player doesn't have the minted assets.");
    });

    it('Mint data length input mismatch', async () => {        
        var invalidLengthData = [playerAddress, [1, 2], [10]];
        await TruffleAssert.fails(
            content.mintBatch(invalidLengthData, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Mint invalid token id', async () => {
        var invalidTokenIdData = [playerAddress, [4, 5], [1,1]];
        await TruffleAssert.fails(
            content.mintBatch(invalidTokenIdData, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Mint invalid supply', async () => {
        var invalidSupplyData = [playerAddress, [2], [300]];
        await TruffleAssert.fails(
            content.mintBatch(invalidSupplyData, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Burn Assets', async () => {
        var mintData = [playerAddress, [1], [10]];
        await content.mintBatch(mintData, {from: deployerAddress});

        var burnData = [playerAddress, [1], [5]];
        await content.burnBatch(burnData, {from: playerAddress});
        assert.equal(await content.supply(1), 5, "Asset 1 incorrect supply");

        await content.burnBatch(burnData, {from: craftingSystemAddress});
        assert.equal(await content.supply(1), 0, "Asset 1 incorrect supply");
        
        var balance = await content.balanceOf(playerAddress, 1);
        assert.equal(balance.valueOf().toString(), "0", "Player still has the burned assets.");
    });
    
    it('Invalid burns', async () => {
        var mintData = [playerAddress, [1], [10]];
        await content.mintBatch(mintData, {from: deployerAddress});

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
        var mintData = [playerAddress, [1], [10]];
        await content.mintBatch(mintData, {from: deployerAddress});

        TruffleAssert.eventEmitted(
            await content.safeTransferFrom(playerAddress, player2Address, 1, 1, 0, {from:playerAddress}),
            'TransferSingle'
        );
    });

    it('Invalid Transfer Assets', async () => {
        var mintData = [playerAddress, [1], [10]];
        await content.mintBatch(mintData, {from: deployerAddress});
        
        await TruffleAssert.fails(
            content.safeTransferFrom(playerAddress, player2Address, 1, 1, 0, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
