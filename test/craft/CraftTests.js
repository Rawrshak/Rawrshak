const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const TestCraft = artifacts.require("TestCraft");
const ContractRegistry = artifacts.require("ContractRegistry");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

// Todo: Update this test
contract('Craft Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,             // platform address fees
        creatorAddress,             // content nft Address
        playerAddress,              // player 1 address
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

    var craft;
    var manager_role;

    // var nftAssetData;
    var initialRecipe;

    beforeEach(async () => {
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();

        // Set up NFT Contract
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
        
        // Add 2 assets
        await contentManager.addAssetBatch(asset);
    
        // Mint an assets
        var mintData = [playerAddress, [1, 2, 3, 4, 5], [10, 10, 10, 10, 10], 1, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        craft = await TestCraft.new();
        await craft.__TestCraft_init(1000);
        
        manager_role = await craft.MANAGER_ROLE();
        
        // Register the craft as a system on the content contract
        var approvalPair = [[craft.address, true], [creatorAddress, true]];
        await contentManager.registerOperators(approvalPair, {from: deployerAddress});

        // registered manager
        await craft.registerManager(managerAddress, {from: deployerAddress});
        
        initialRecipe = [
            [
                web3.utils.toWei('1', 'ether'), // crafting rate
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
        var recipeId = 0;
        var newRecipe = [
            [
                web3.utils.toWei('1', 'ether'), // crafting rate
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

        var results = await craft.addRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        var storedRecipeData = await craft.recipe(0);
        
        assert.equal(storedRecipeData.craftingRate, web3.utils.toWei('1', 'ether'), "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, true, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
    });

    it('Add Multiple Recipes', async () => {
        var newRecipe = [
            [
                web3.utils.toWei('1', 'ether'), // crafting rate
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
                web3.utils.toWei('0.5', 'ether'), // crafting rate
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
        
        var results = await craft.addRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');
        var storedRecipeData = await craft.recipe(0);
        
        // check recipe 0
        assert.equal(storedRecipeData.craftingRate, web3.utils.toWei('1', 'ether'), "crafting rate incorrect");
        assert.equal(storedRecipeData.enabled, true, "recipe enabled incorrect");
        assert.equal(storedRecipeData.materials.length, 2, "materials length incorrect");
        assert.equal(storedRecipeData.materialAmounts.length, 2, "materials amounts length incorrect");
        assert.equal(storedRecipeData.rewards.length, 1, "rewards length incorrect");
        assert.equal(storedRecipeData.rewardAmounts.length, 1, "rewards amounts length incorrect");
        
        // check recipe 1
        var storedRecipeData = await craft.recipe(1);
        
        assert.equal(storedRecipeData.craftingRate, web3.utils.toWei('0.5', 'ether'), "crafting rate incorrect");
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

    it('Failing to add Recipes', async () => {
        // test invalid permission
        await TruffleAssert.fails(
            craft.addRecipeBatch(initialRecipe, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // test invalid length
        await TruffleAssert.fails(
            craft.addRecipeBatch([], {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // materials length mismatch
        var invalidRecipe = [
            [
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
        await TruffleAssert.fails(
            craft.addRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // rewards length mismatch
        var invalidRecipe = [
            [
                web3.utils.toWei('0.5', 'ether'), // crafting rate
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
        await TruffleAssert.fails(
            craft.addRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid crafting rate
        var invalidRecipe = [
            [
                web3.utils.toWei('1.01', 'ether'), // crafting rate
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
        await TruffleAssert.fails(
            craft.addRecipeBatch(invalidRecipe, {from: managerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Craft a recipe', async () => {
        var results = await craft.addRecipeBatch(initialRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});

        // Approve craft contract as an operator
        await content.setApprovalForAll(craft.address, true, {from: playerAddress});

        var results = await craft.craft(0, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        assert.equal(await content.balanceOf(playerAddress, 3), 9, "Material was not burned.");
        assert.equal(await content.totalSupply(3), 9, "Material supply is incorrect");
        assert.equal(await content.balanceOf(playerAddress, 6), 1, "Reward was not burned.");
        assert.equal(await content.totalSupply(6), 1, "Reward supply is incorrect");
    });

    it('Craft multiple instances of a recipe', async () => {
        var newRecipe = [
            [
                web3.utils.toWei('1', 'ether'), // crafting rate
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
                web3.utils.toWei('1', 'ether'), // crafting rate
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

        var results = await craft.addRecipeBatch(newRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});

        // Approve craft contract as an operator
        await content.setApprovalForAll(craft.address, true, {from: playerAddress});
        
        // Craft recipe 1
        var results = await craft.craft(0, 3, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        assert.equal(await content.balanceOf(playerAddress, 3), 7, "Material 1 was not burned.");
        assert.equal(await content.totalSupply(3), 7, "Material 1 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 4), 7, "Material 2 was not burned.");
        assert.equal(await content.totalSupply(4), 7, "Material 2 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 6), 3, "Reward was not created.");
        assert.equal(await content.totalSupply(6), 3, "Reward supply is incorrect.");
        
        // Craft recipe 2
        var results = await craft.craft(1, 2, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'AssetsCrafted');
        
        assert.equal(await content.balanceOf(playerAddress, 3), 3, "Material 1 was not burned.");
        assert.equal(await content.totalSupply(3), 3, "Material 1 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 5), 4, "Material 2 was not burned.");
        assert.equal(await content.totalSupply(5), 4, "Material 2 supply is incorrect.");
        assert.equal(await content.balanceOf(playerAddress, 7), 4, "Reward was not created.");
        assert.equal(await content.totalSupply(7), 4, "Reward supply is incorrect.");
    });

    it('Invalid Craft', async () => {
        var results = await craft.addRecipeBatch(initialRecipe, {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'RecipeUpdated');

        // player has not approved craft as an operator yet
        await TruffleAssert.fails(
            craft.craft(1, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Approve craft contract as an operator
        await content.setApprovalForAll(craft.address, true, {from: playerAddress});

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false, {from: managerAddress});

        // invalid id
        await TruffleAssert.fails(
            craft.craft(1, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // invalid amount
        await TruffleAssert.fails(
            craft.craft(0, 0, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // player doesn't have enough assets to satisfy the crafting amount
        await TruffleAssert.fails(
            craft.craft(0, 11, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // disable the recipe
        await craft.managerSetPause(true, {from: managerAddress});
        await craft.enableRecipe(0, false, {from: managerAddress});
        await craft.managerSetPause(false, {from: managerAddress});
        await TruffleAssert.fails(
            craft.craft(0, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
