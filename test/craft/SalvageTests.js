const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const TestSalvage = artifacts.require("TestSalvage");
const ContractRegistry = artifacts.require("ContractRegistry");
const TagsManager = artifacts.require("TagsManager");
const TruffleAssert = require("truffle-assertions");

// Todo: Update this test
contract('Salvage Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
        creatorAddress,             // content nft Address
        creator2Address,             // creator Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 0, []],
        [2, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 100, []],
        [3, "arweave.net/tx/public-Material-1", "arweave.net/tx/private-Material-1",10000, []],
        [4, "arweave.net/tx/public-Material-2", "arweave.net/tx/private-Material-2", 10000, []],
        [5, "arweave.net/tx/public-Material-3", "arweave.net/tx/private-Material-3", 10000, []],
        [6, "arweave.net/tx/public-Reward-1", "arweave.net/tx/private-Reward-1", 0, []],
        [7, "arweave.net/tx/public-Reward-2", "arweave.net/tx/private-Reward-2", 0, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    var salvage;
    var manager_role;

    var nftAssetData;
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    var initialSalvageableAssetData;

    beforeEach(async () => {
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();
        tagsManager = await TagsManager.new();
        await tagsManager.__TagsManager_init(registry.address);

        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address, tagsManager.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        var approvalPair = [[creatorAddress, true]];
        await contentManager.registerSystem(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        nftAssetData = [content.address, 1];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // approve systems for player address
        await content.approveAllSystems(true, {from:playerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 10], 1, zeroAddress, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        // Set contract royalties
        var assetRoyalty = [[creatorAddress, web3.utils.toWei('0.02', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty, {from: deployerAddress});

        salvage = await TestSalvage.new();
        await salvage.__TestSalvage_init(1000);
        
        manager_role = await salvage.MANAGER_ROLE();
        
        // Register the salvage as a system on the content contract
        var approvalPair = [[salvage.address, true]];
        await contentManager.registerSystem(approvalPair, {from: deployerAddress});

        // registered manager
        await salvage.registerManager(managerAddress, {from: deployerAddress});

        // Register the content contract
        await salvage.registerContent(await contentManager.content(), {from: managerAddress});
        
        initialSalvageableAssetData = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 4],
                        web3.utils.toWei('1', 'ether'),
                        1
                    ]
                ]
            ]
        ];
    });

    it('Check if Salvage Contract was deployed properly', async () => {
        assert.equal(
            salvage.address != 0x0,
            true,
            "Salvage Contract was not deployed properly.");
    });

    it('Asset ID calculation', async () => {
        var assetId = await salvage.getId(nftAssetData, {from: playerAddress});

        assert.notEqual(assetId.toString(), 0x0, "Id is empty");
    });

    it('Add Salvageable Assets', async () => {
        var results = await salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'SalvageableAssetsUpdated');

        var assetId = results.logs[0].args.ids[0];
        // console.log(assetId)
        // assert.notEqual(results.logs[0].args[1].toString(), 0x0, "Id is empty");

        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId.toString());
        var rewardsData = await salvage.getSalvageRewards(assetId.toString());

        // console.log(storedSalvageableAssetData);

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 0, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, web3.utils.toWei('1', 'ether'), "Invalid Reward probability");
        }
    });
    
    it('Add Multiple Salvageable Assets', async () => {
        var salvageableAssets = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 4],
                        web3.utils.toWei('1', 'ether'),
                        1
                    ]
                ]
            ],
            [
                [content.address, 2],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('0.5', 'ether'),
                        2
                    ],
                    [
                        [content.address, 5],
                        web3.utils.toWei('0.5', 'ether'),
                        3
                    ]
                ]
            ]
        ];

        var results = await salvage.setSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'SalvageableAssetsUpdated');
        
        // console.log(results.logs[0].args)
        var assetId1 = results.logs[0].args.ids[0];
        var assetId2 = results.logs[0].args.ids[1];
        
        // Test Asset 1
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId1.toString());
        var rewardsData = await salvage.getSalvageRewards(assetId1.toString());

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 0, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, web3.utils.toWei('1', 'ether'), "Invalid Reward probability");
        }
        
        // Test Asset 2
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId2.toString());
        var rewardsData = await salvage.getSalvageRewards(assetId2.toString());

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 2, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 1, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, web3.utils.toWei('0.5', 'ether'), "Invalid Reward probability");
        }
    });

    it('Update Salvageable Assets', async () => {
        var results = await salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        var updatedData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        web3.utils.toWei('0.1', 'ether'),
                        1
                    ]
                ]
            ]
        ];

        results = await salvage.setSalvageableAssetBatch(updatedData, {from: managerAddress});
        
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId.toString());
        var rewardsData = await salvage.getSalvageRewards(assetId.toString());

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 1, "Salvage Type not updated");
        assert.equal(rewardsData.length, 1, "rewards length not updated");
        assert.equal(rewardsData[0].asset.tokenId, 5, "Invalid reward updated");
        assert.equal(rewardsData[0].probability, web3.utils.toWei('0.1', 'ether'), "Invalid Reward probability updated");
        assert.equal(rewardsData[0].amount, 1, "Invalid Reward probability updated");
    });

    it('Failing to Add Salvageable Assets', async () => {
        // test invalid permission
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test empty input
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch([], {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // test invalid contract asset
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        var contentStorage2 = await ContentStorage.new();
        await contentStorage2.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        var content2 = await Content.new();
        await content2.__Content_init("Test Content Contract", "TEST2", contentStorage2.address, systemsRegistry.address);
        contentStorage2.setParent(content2.address);
        systemsRegistry.setParent(content2.address);
        
        var invalidData = [
            [
                [content2.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        web3.utils.toWei('0.1', 'ether'),
                        1
                    ]
                ]
            ]
        ];

        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // invalid salvage type
        invalidData = [
            [
                [content.address, 1],
                3,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        web3.utils.toWei('0.1', 'ether'),
                        1
                    ]
                ]
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test invalid reward length 
        invalidData = [
            [
                [content.address, 1],
                1,
                []
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test invalid reward asset contract
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content2.address, 5],
                        web3.utils.toWei('0.1', 'ether'),
                        1
                    ]
                ]
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid probability
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content2.address, 5],
                        web3.utils.toWei('1.001', 'ether'),
                        1
                    ]
                ]
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content2.address, 5],
                        0,
                        1
                    ]
                ]
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid reward amount
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content2.address, 5],
                        web3.utils.toWei('1', 'ether'),
                        0
                    ]
                ]
            ]
        ];
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // test not paused
        await salvage.managerSetPause(false, {from: managerAddress});
        TruffleAssert.fails(
            salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Salvage Asset', async () => {
        var results = await salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        var results = await salvage.salvage([content.address, 1], 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvaged');

        assert.equal(await content.balanceOf(playerAddress, 1), 9, "Asset was not burned.");
        assert.equal(await content.supply(1), 9, "Asset supply is incorrect.");

        assert.equal(await content.balanceOf(playerAddress, 3), 2, "Materials Asset 3 was not minted to player");
        assert.equal(await content.supply(3), 2, "Materials Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 1, "Materials Asset 4 was not minted to player");
        assert.equal(await content.supply(4), 1, "Materials Asset 4 supply is incorrect.");
    });

    it('Salvage multiple instances of the same asset', async () => {
        var results = await salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        var results = await salvage.salvage([content.address, 1], 5, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvaged');

        assert.equal(await content.balanceOf(playerAddress, 1), 5, "Asset was not burned.");
        assert.equal(await content.supply(1), 5, "Asset supply is incorrect.");

        assert.equal(await content.balanceOf(playerAddress, 3), 10, "Materials Asset 3 was not minted to player");
        assert.equal(await content.supply(3), 10, "Materials Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 5, "Materials Asset 4 was not minted to player");
        assert.equal(await content.supply(4), 5, "Materials Asset 4 supply is incorrect.");
    });

    it('Salvage Multiple Asset', async () => {
        var salvageableAssets = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 4],
                        web3.utils.toWei('1', 'ether'),
                        1
                    ]
                ]
            ],
            [
                [content.address, 2],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 5],
                        web3.utils.toWei('1', 'ether'),
                        3
                    ]
                ]
            ]
        ];
        var results = await salvage.setSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        var assetsToSalvage = [
            [content.address, 1],
            [content.address, 2]
        ];
        var amounts = [1, 1];
        var results = await salvage.salvageBatch(assetsToSalvage, amounts, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvagedBatch');

        assert.equal(await content.balanceOf(playerAddress, 1), 9, "Asset was not burned.");
        assert.equal(await content.supply(1), 9, "Asset supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 2), 9, "Asset 2 was not burned.");
        assert.equal(await content.supply(2), 9, "Asset 2 supply is incorrect.");
        
        assert.equal(await content.balanceOf(playerAddress, 3), 4, "Asset 3 was not burned.");
        assert.equal(await content.supply(3), 4, "Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 1, "Asset 4 was not burned.");
        assert.equal(await content.supply(4), 1, "Asset 4 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 5), 3, "Asset 5 was not burned.");
        assert.equal(await content.supply(5), 3, "Asset 5 supply is incorrect.");
    });

    it('Salvage multiple instances of multiple asset', async () => {
        var salvageableAssets = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 4],
                        web3.utils.toWei('1', 'ether'),
                        1
                    ]
                ]
            ],
            [
                [content.address, 2],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        web3.utils.toWei('1', 'ether'),
                        2
                    ],
                    [
                        [content.address, 5],
                        web3.utils.toWei('1', 'ether'),
                        3
                    ]
                ]
            ]
        ];
        var results = await salvage.setSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        var assetsToSalvage = [
            [content.address, 1],
            [content.address, 2]
        ];
        var amounts = [5, 7];
        var results = await salvage.salvageBatch(assetsToSalvage, amounts, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvagedBatch');

        assert.equal(await content.balanceOf(playerAddress, 1), 5, "Asset was not burned.");
        assert.equal(await content.supply(1), 5, "Asset supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 2), 3, "Asset 2 was not burned.");
        assert.equal(await content.supply(2), 3, "Asset 2 supply is incorrect.");
        
        assert.equal(await content.balanceOf(playerAddress, 3), 24, "Asset 3 was not burned.");
        assert.equal(await content.supply(3), 24, "Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 5, "Asset 4 was not burned.");
        assert.equal(await content.supply(4), 5, "Asset 4 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 5), 21, "Asset 5 was not burned.");
        assert.equal(await content.supply(5), 21, "Asset 5 supply is incorrect.");
    });

    it('Invalid Salvage Asset', async () => {
        var results = await salvage.setSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];
        
        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        // Invalid amount
        var assetData = [content.address, 1];
        TruffleAssert.fails(
            salvage.salvage(assetData, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid user balance
        TruffleAssert.fails(
            salvage.salvage(assetData, 15, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // item not salvageable
        var assetData = [content.address, 3];
        TruffleAssert.fails(
            salvage.salvage(assetData, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    // it('Salvage Asset with Random Salvage Type', async () => {
    // });

});
