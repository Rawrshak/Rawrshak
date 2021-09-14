const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const TestSalvage = artifacts.require("TestSalvage");
const ContractRegistry = artifacts.require("ContractRegistry");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('Salvage Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
        creatorAddress,             // content nft Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", constants.MAX_UINT256, []],
        [2, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 100, []],
        [3, "arweave.net/tx/public-Material-1", "arweave.net/tx/private-Material-1",10000, []],
        [4, "arweave.net/tx/public-Material-2", "arweave.net/tx/private-Material-2", 10000, []],
        [5, "arweave.net/tx/public-Material-3", "arweave.net/tx/private-Material-3", 10000, []],
        [6, "arweave.net/tx/public-Reward-1", "arweave.net/tx/private-Reward-1", constants.MAX_UINT256, []],
        [7, "arweave.net/tx/public-Reward-2", "arweave.net/tx/private-Reward-2", constants.MAX_UINT256, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    var salvage;
    var manager_role;

    var nftAssetData;

    var initialSalvageableAssetData;

    beforeEach(async () => {
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();

        accessControlManager = await AccessControlManager.new();
        await accessControlManager.__AccessControlManager_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, accessControlManager.address);
        await contentStorage.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, accessControlManager.address);
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.grantRole(await accessControlManager.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.setParent(content.address);

        // Add 7 assets
        await contentManager.addAssetBatch(asset);
        
        nftAssetData = [content.address, 1];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 10], 1, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        // Set contract royalties
        var assetRoyalty = [[creatorAddress, web3.utils.toWei('0.02', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty, {from: deployerAddress});

        salvage = await TestSalvage.new();
        await salvage.__TestSalvage_init(1000);
        
        manager_role = await salvage.MANAGER_ROLE();
        
        // Register the salvage as a system on the content contract
        var approvalPair = [[salvage.address, true], [creatorAddress, true]];
        await contentManager.registerOperators(approvalPair, {from: deployerAddress});

        // registered manager
        await salvage.registerManager(managerAddress, {from: deployerAddress});
        
        initialSalvageableAssetData = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
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

    it('Add Salvageable Assets', async () => {
        var results = await salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'SalvageableAssetsUpdated');

        var assetId = results.logs[0].args.ids[0];
        // console.log(assetId)
        // assert.notEqual(results.logs[0].args[1].toString(), 0x0, "Id is empty");

        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId.toString());
        var rewardsData = await salvage.getSalvageRewards([content.address, 1]);

        // console.log(storedSalvageableAssetData);

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 0, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, 1000000, "Invalid Reward probability");
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
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
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
                        500000,
                        2
                    ],
                    [
                        [content.address, 5],
                        500000,
                        3
                    ]
                ]
            ]
        ];

        var results = await salvage.addSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'SalvageableAssetsUpdated');
        
        // console.log(results.logs[0].args)
        var assetId1 = results.logs[0].args.ids[0];
        var assetId2 = results.logs[0].args.ids[1];
        
        // Test Asset 1
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId1.toString());
        var rewardsData = await salvage.getSalvageRewards([content.address, 1]);

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 0, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, 1000000, "Invalid Reward probability");
        }
        
        // Test Asset 2
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId2.toString());
        var rewardsData = await salvage.getSalvageRewards([content.address, 2]);

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 2, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 1, "Salvage Type incorrect");
        assert.equal(rewardsData.length, 2, "rewards length incorrect");
        for (var i = 0; i < rewardsData.length; ++i) {
            assert.equal(rewardsData[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(rewardsData[i].probability, 500000, "Invalid Reward probability");
        }
    });

    it('Update Salvageable Assets', async () => {
        var results = await salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        var updatedData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        100000,
                        1
                    ]
                ]
            ]
        ];

        results = await salvage.addSalvageableAssetBatch(updatedData, {from: managerAddress});
        
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId.toString());
        var rewardsData = await salvage.getSalvageRewards([content.address, 1]);

        assert.equal(storedSalvageableAssetData.asset.content, content.address, "asset content address incorrect");
        assert.equal(storedSalvageableAssetData.asset.tokenId, 1, "asset id incorrect");
        assert.equal(storedSalvageableAssetData.salvageType.toString(), 1, "Salvage Type not updated");
        assert.equal(rewardsData.length, 1, "rewards length not updated");
        assert.equal(rewardsData[0].asset.tokenId, 5, "Invalid reward updated");
        assert.equal(rewardsData[0].probability, 100000, "Invalid Reward probability updated");
        assert.equal(rewardsData[0].amount, 1, "Invalid Reward amount updated");
    });

    it('Failing to Add Salvageable Assets', async () => {
        // test invalid permission
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test empty input
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch([], {from: managerAddress}),
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
                        100000,
                        1
                    ]
                ]
            ]
        ];
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(invalidData, {from: managerAddress}),
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
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid probability
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        1000001,
                        1
                    ]
                ]
            ]
        ];
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        0,
                        1
                    ]
                ]
            ]
        ];
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid reward amount
        invalidData = [
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 5],
                        1000000,
                        0
                    ]
                ]
            ]
        ];
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(invalidData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // test not paused
        await salvage.managerSetPause(false, {from: managerAddress});
        await TruffleAssert.fails(
            salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Salvage Asset', async () => {
        var results = await salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});
        
        // Approve salvage contract as an operator
        await content.setApprovalForAll(salvage.address, true, {from: playerAddress});

        var results = await salvage.salvage([content.address, 1], 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvaged');

        assert.equal(await content.balanceOf(playerAddress, 1), 9, "Asset was not burned.");
        assert.equal(await content.totalSupply(1), 9, "Asset supply is incorrect.");

        assert.equal(await content.balanceOf(playerAddress, 3), 2, "Materials Asset 3 was not minted to player");
        assert.equal(await content.totalSupply(3), 2, "Materials Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 1, "Materials Asset 4 was not minted to player");
        assert.equal(await content.totalSupply(4), 1, "Materials Asset 4 supply is incorrect.");
    });

    it('Salvage multiple instances of the same asset', async () => {
        var results = await salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});
        
        // Approve salvage contract as an operator
        await content.setApprovalForAll(salvage.address, true, {from: playerAddress});

        var results = await salvage.salvage([content.address, 1], 5, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvaged');

        assert.equal(await content.balanceOf(playerAddress, 1), 5, "Asset was not burned.");
        assert.equal(await content.totalSupply(1), 5, "Asset supply is incorrect.");

        assert.equal(await content.balanceOf(playerAddress, 3), 10, "Materials Asset 3 was not minted to player");
        assert.equal(await content.totalSupply(3), 10, "Materials Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 5, "Materials Asset 4 was not minted to player");
        assert.equal(await content.totalSupply(4), 5, "Materials Asset 4 supply is incorrect.");
    });

    it('Salvage Multiple Asset', async () => {
        var salvageableAssets = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
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
                        1000000,
                        2
                    ],
                    [
                        [content.address, 5],
                        1000000,
                        3
                    ]
                ]
            ]
        ];
        var results = await salvage.addSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});
        
        // Approve salvage contract as an operator
        await content.setApprovalForAll(salvage.address, true, {from: playerAddress});

        var assetsToSalvage = [
            [content.address, 1],
            [content.address, 2]
        ];
        var amounts = [1, 1];
        var results = await salvage.salvageBatch(assetsToSalvage, amounts, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvagedBatch');

        assert.equal(await content.balanceOf(playerAddress, 1), 9, "Asset was not burned.");
        assert.equal(await content.totalSupply(1), 9, "Asset supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 2), 9, "Asset 2 was not burned.");
        assert.equal(await content.totalSupply(2), 9, "Asset 2 supply is incorrect.");
        
        assert.equal(await content.balanceOf(playerAddress, 3), 4, "Asset 3 was not burned.");
        assert.equal(await content.totalSupply(3), 4, "Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 1, "Asset 4 was not burned.");
        assert.equal(await content.totalSupply(4), 1, "Asset 4 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 5), 3, "Asset 5 was not burned.");
        assert.equal(await content.totalSupply(5), 3, "Asset 5 supply is incorrect.");
    });

    it('Salvage multiple instances of multiple asset', async () => {
        var salvageableAssets = [
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 3],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
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
                        1000000,
                        2
                    ],
                    [
                        [content.address, 5],
                        1000000,
                        3
                    ]
                ]
            ]
        ];
        var results = await salvage.addSalvageableAssetBatch(salvageableAssets, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        // Approve salvage contract as an operator
        await content.setApprovalForAll(salvage.address, true, {from: playerAddress});

        var assetsToSalvage = [
            [content.address, 1],
            [content.address, 2]
        ];
        var amounts = [5, 7];
        var results = await salvage.salvageBatch(assetsToSalvage, amounts, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetSalvagedBatch');

        assert.equal(await content.balanceOf(playerAddress, 1), 5, "Asset was not burned.");
        assert.equal(await content.totalSupply(1), 5, "Asset supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 2), 3, "Asset 2 was not burned.");
        assert.equal(await content.totalSupply(2), 3, "Asset 2 supply is incorrect.");
        
        assert.equal(await content.balanceOf(playerAddress, 3), 24, "Asset 3 was not burned.");
        assert.equal(await content.totalSupply(3), 24, "Asset 3 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 5, "Asset 4 was not burned.");
        assert.equal(await content.totalSupply(4), 5, "Asset 4 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 5), 21, "Asset 5 was not burned.");
        assert.equal(await content.totalSupply(5), 21, "Asset 5 supply is incorrect.");
    });

    it('Invalid Salvage Asset', async () => {
        var results = await salvage.addSalvageableAssetBatch(initialSalvageableAssetData, {from: managerAddress});
        var assetId = results.logs[0].args.ids[0];
        
        // unpause the salvage contract so we can start salvaging assets
        await salvage.managerSetPause(false, {from: managerAddress});

        // no content contract approval for the salvage contract
        var assetData = [content.address, 1];
        await TruffleAssert.fails(
            salvage.salvage(assetData, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // Approve salvage contract as an operator
        await content.setApprovalForAll(salvage.address, true, {from: playerAddress});
        
        // Invalid amount
        var assetData = [content.address, 1];
        await TruffleAssert.fails(
            salvage.salvage(assetData, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid user balance
        await TruffleAssert.fails(
            salvage.salvage(assetData, 15, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // item not salvageable
        var assetData = [content.address, 3];
        await TruffleAssert.fails(
            salvage.salvage(assetData, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    // // it('Salvage Asset with Random Salvage Type', async () => {
    // // });

});
