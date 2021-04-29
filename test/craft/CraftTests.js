const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const Craft = artifacts.require("Craft");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const OrderbookManager = artifacts.require("OrderbookManager");
const OrderbookStorage = artifacts.require("OrderbookStorage");
const ExecutionManager = artifacts.require("ExecutionManager");
const RoyaltyManager = artifacts.require("RoyaltyManager");
const Exchange = artifacts.require("Exchange");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Craft Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
        testManagerAddress,         // Only for putting in data for testing
        creator1Address,             // content nft Address
        creator2Address,             // creator Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    // NFT
    var content;
    var contentStorage;
    var contentManager;
    var asset = [
        [1, "SalvageItem-1", 0, []],
        [2, "SalvageItem-2", 100, []],
        [3, "Material-1", 10000, []],
        [4, "Material-2", 10000, []],
        [5, "Material-3", 10000, []],
        [6, "Reward-1", 0, []],
        [7, "Reward-2", 0, []],
    ];

    // Rawr Token 
    var rawrId = "0xd4df6855";
    var rawrToken;

    var craft;
    var manager_role;
    var default_admin_role;

    var nftAssetData;
    var initialRecipe;

    beforeEach(async () => {
        // Set up NFT Contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address);
        contentStorage.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        var approvalPair = [[deployerAddress, true], [contentManager.address, true]];
        await contentManager.registerSystem(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        nftAssetData = [content.address, 2];

        // Setup RAWR token
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // approve systems for player address
        await content.approveAllSystems(true, {from:playerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2, 3, 4, 5], [10, 10, 10, 10, 10]];
        await contentManager.mintBatch(mintData, {from: deployerAddress});
        // var mintData = [player2Address, [1, 2], [10, 10]];
        // await contentManager.mintBatch(mintData, {from: deployerAddress});

        // Set contract royalties
        var assetRoyalty = [[creator1Address, 200]];
        await contentManager.setContractRoyalties(assetRoyalty, {from: deployerAddress});

        craft = await Craft.new();
        await craft.__Craft_init(1000);
        
        manager_role = await craft.MANAGER_ROLE();
        
        // Register the craft as a system on the content contract
        var approvalPair = [[craft.address, true]];
        await contentManager.registerSystem(approvalPair, {from: deployerAddress});

        // registered manager
        await craft.registerManager(managerAddress, {from: deployerAddress});
        
        // Register the content contract
        await craft.registerContent(await contentManager.content(), {from: managerAddress});
        
        initialRecipe = [
            [
                1, // id
                10000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 3]
                ],
                [1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
    });

    it('Check if Craft Contract was deployed properly', async () => {
        assert.equal(
            craft.address != 0x0,
            true,
            "Craft Contract was not deployed properly.");
    });

    it('Add Recipes', async () => {
        var recipeId = 1;
        var newRecipe = [
            [
                recipeId, // id
                10000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];

        var results = await craft.setRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        var storedRecipeData = await craft.getRecipe(recipeId.toString());
        
        assert.equal(storedRecipeData.id, recipeId, "recipe id incorrect");
        assert.equal(storedRecipeData.craftingRate, 10000, "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, true, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
    });

    it('Add Multiple Recipes', async () => {
        var recipeId1 = 1;
        var recipeId2 = 2;
        var newRecipe = [
            [
                recipeId1, // id
                10000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ],
            [
                recipeId2, // id
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 5]
                ],
                [2, 3], // array of material amounts
                [   // array of reward asset data
                    [content.address, 7]
                ],
                [2] // array of reward amounts
            ]
        ];
        
        var results = await craft.setRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        var storedRecipeData = await craft.getRecipe(recipeId1.toString());
        
        // check recipe 1
        assert.equal(storedRecipeData.id, recipeId1, "recipe id incorrect");
        assert.equal(storedRecipeData.craftingRate, 10000, "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, true, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
        
        // check recipe 2
        var storedRecipeData = await craft.getRecipe(recipeId2.toString());
        
        assert.equal(storedRecipeData.id, recipeId2, "recipe id incorrect");
        assert.equal(storedRecipeData.craftingRate, 5000, "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, false, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materials[0].content, content.address, "material 1 content contract incorrect");
        assert.equal(storedRecipeData.materials[1].content, content.address, "material 2 content contract incorrect");
        assert.equal(storedRecipeData.materials[0].tokenId, 3, "material 1 token incorrect");
        assert.equal(storedRecipeData.materials[1].tokenId, 5, "material 2 token incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.materialAmounts[0], 2, "material 1 amount incorrect");
        assert.equal(storedRecipeData.materialAmounts[1], 3, "material 2 amount incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewards[0].content, content.address, "rewards content contract incorrect");
        assert.equal(storedRecipeData.rewards[0].tokenId, 7, "rewards 1 token incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
        assert.equal(storedRecipeData.rewardAmounts[0], 2, "rewards amount incorrect");
    });

    it('Update Recipes', async () => {
        var results = await craft.setRecipeBatch(initialRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        
        var recipeId = 1;
        var updateRecipe = [
            [
                recipeId, // id
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];

        var results = await craft.setRecipeBatch(updateRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        var storedRecipeData = await craft.getRecipe(recipeId.toString());
        
        assert.equal(storedRecipeData.id, recipeId, "recipe id incorrect");
        assert.equal(storedRecipeData.craftingRate, 5000, "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, false, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
    });

    it('Failing to add Recipes', async () => {
        // test invalid permission
        TruffleAssert.fails(
            craft.setRecipeBatch(initialRecipe, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test invalid length
        TruffleAssert.fails(
            craft.setRecipeBatch([], {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // materials length mismatch
        var invalidRecipe = [
            [
                1, // id
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // rewards length mismatch
        var invalidRecipe = [
            [
                1, // id
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1, 1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // recipe id = 0
        var invalidRecipe = [
            [
                0, // id
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid crafting rate
        var invalidRecipe = [
            [
                0, // id
                10001, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // materials invalid content permission
        // test invalid contract asset
        var contentStorage2 = await ContentStorage.new();
        await contentStorage2.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        var content2 = await Content.new();
        await content2.__Content_init("Test Content Contract", "TEST2", "ipfs:/contract-uri", contentStorage2.address);

        var invalidRecipe = [
            [
                1, // id
                10000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content2.address, 3],
                    [content2.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // rewards invalid content permission
        var invalidRecipe = [
            [
                1, // id
                10000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content2.address, 6]
                ],
                [1] // array of reward amounts
            ]
        ];
        TruffleAssert.fails(
            craft.setRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Craft a recipe', async () => {
        var results = await craft.setRecipeBatch(initialRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});

        var results = await craft.craft(1, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        var result = await content.getSupplyInfo(3);
        assert.equal(await content.balanceOf(playerAddress, 3), 9, "Material was not burned.");
        assert.equal(result.supply, 9, "Material supply is incorrect.");

        result = await content.getSupplyInfo(6);
        assert.equal(await content.balanceOf(playerAddress, 6), 1, "Reward was not burned.");
        assert.equal(result.supply, 1, "Reward supply is incorrect.");
    });

    it('Craft multiple instances of a recipe', async () => {
        var recipeId1 = 1;
        var recipeId2 = 2;
        var newRecipe = [
            [
                recipeId1, // id
                10000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 4]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [1] // array of reward amounts
            ],
            [
                recipeId2, // id
                5000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 3],
                    [content.address, 5]
                ],
                [2, 3], // array of material amounts
                [   // array of reward asset data
                    [content.address, 7]
                ],
                [2] // array of reward amounts
            ]
        ];

        var results = await craft.setRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});
        
        // Craft recipe 1
        var results = await craft.craft(recipeId1, 3, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        var result = await content.getSupplyInfo(3);
        assert.equal(await content.balanceOf(playerAddress, 3), 7, "Material 1 was not burned.");
        assert.equal(result.supply, 7, "Material 1 supply is incorrect.");
        result = await content.getSupplyInfo(4);
        assert.equal(await content.balanceOf(playerAddress, 4), 7, "Material 2 was not burned.");
        assert.equal(result.supply, 7, "Material 2 supply is incorrect.");
        result = await content.getSupplyInfo(6);
        assert.equal(await content.balanceOf(playerAddress, 6), 3, "Reward was not burned.");
        assert.equal(result.supply, 3, "Reward supply is incorrect.");
        
        // Craft recipe 2
        var results = await craft.craft(recipeId2, 2, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        result = await content.getSupplyInfo(3);
        assert.equal(await content.balanceOf(playerAddress, 3), 3, "Material 1 was not burned.");
        assert.equal(result.supply, 3, "Material 1 supply is incorrect.");
        result = await content.getSupplyInfo(5);
        assert.equal(await content.balanceOf(playerAddress, 5), 4, "Material 2 was not burned.");
        assert.equal(result.supply, 4, "Material 2 supply is incorrect.");
        result = await content.getSupplyInfo(7);
        assert.equal(await content.balanceOf(playerAddress, 7), 4, "Reward was not burned.");
        assert.equal(result.supply, 4, "Reward supply is incorrect.");
    });

    it('Invalid Craft', async () => {
        var results = await craft.setRecipeBatch(initialRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});

        // invalid id
        TruffleAssert.fails(
            craft.craft(2, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid amount
        TruffleAssert.fails(
            craft.craft(1, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // player doesn't have enough assets to satisfy the crafting amount
        TruffleAssert.fails(
            craft.craft(1, 11, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
