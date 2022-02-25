const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Craft Contract', () => {
    var deployerAddress, craftingSystemAddress, minterAddress, playerAddress;
    var contentFactory;
    var contentManager;
    var contentStorage;
    var AccessControlManager, ContentManager, ContentStorage, Content;

    // NFT
    var content;
    var craft;
    var initialRecipe;
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    before(async () => {
        [deployerAddress, craftingSystemAddress, minterAddress, playerAddress] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        Craft = await ethers.getContractFactory("Craft");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");

        originalAccessControlManager = await AccessControlManager.deploy();
        originalContent = await Content.deploy();
        originalContentStorage = await ContentStorage.deploy();
        originalContentManager = await ContentManager.deploy();

        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);
    });

    beforeEach(async () => {
        craft = await upgrades.deployProxy(Craft, [1000]);
    });

    async function createContentContract() {
        var uri = "arweave.net/tx-contract-uri";

        // deploy contracts
        var tx = await contentFactory.createContracts(deployerAddress.address, 10000, uri);
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

        // Type LibAsset.CreateData
        var assets = [
            ["arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 0, deployerAddress.address, 20000],
            ["arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 100, deployerAddress.address, 0],
            ["arweave.net/tx/public-Material-1", "arweave.net/tx/private-Material-1", 10000, deployerAddress.address, 150],
            ["arweave.net/tx/public-Material-2", "arweave.net/tx/private-Material-2", 10000, deployerAddress.address, 200],
            ["arweave.net/tx/public-Material-3", "arweave.net/tx/private-Material-3", 10000, deployerAddress.address, 250],
            ["arweave.net/tx/public-Reward-1", "arweave.net/tx/private-Reward-1", 0, deployerAddress.address, 300],
            ["arweave.net/tx/public-Reward-2", "arweave.net/tx/private-Reward-2", 0, deployerAddress.address, 350],
        ];

        // Add assets
        await contentManager.addAssetBatch(assets);

        // Give deployer mint role.
        var approvalPair = [[deployerAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Mint assets
        // Type of LibAsset.MintData            
        var mintData = [playerAddress.address, [0, 1, 2, 3, 4], [10, 10, 10, 10, 10], 0, ethers.constants.AddressZero, []];
        await content.mintBatch(mintData);
        
        // Register the craft as a system on the content contract
        var approvalPair = [[craft.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Register managers
        //await craft.registerManager(contentManager.address);
        await craft.registerManager(deployerAddress.address);
        
        var craftApprovalPair = [
            [craft.address, true]
        ];

        await contentManager.registerSystemContracts(craftApprovalPair);
        
        initialRecipe = [
            [
                1000000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 2]
                ],
                [1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ]
        ];

        // approve player
        await content.connect(playerAddress).setApprovalForAll(craft.address, true);
    }

    it('Check if Craft Contract was deployed properly', async () => {
        expect(craft.address != 0x0, "Craft Contract was not deployed properly.").to.equal(true);
    });

    it('Add Recipes', async () => {
        await createContentContract();

        var recipeId = 0;
        var newRecipe = [
            [
                1000000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ]
        ];

        var results = await craft.addRecipeBatch(newRecipe);
        await expect(results)
                .to.emit(craft, 'RecipeAdded');
        var storedRecipeData = await craft.recipe(0);
        
        expect(storedRecipeData.craftingRate == 1000000, "crafting rate incorrect").to.equal(true);
        expect(storedRecipeData.enabled == true, "recipe enabled incorrect").to.equal(true);
        expect(storedRecipeData.materials.length == 2, "materials length incorrect").to.equal(true);
        expect(storedRecipeData.materialAmounts.length == 2, "materials amounts length incorrect").to.equal(true);
        expect(storedRecipeData.rewards.length == 1, "rewards length incorrect").to.equal(true);
        expect(storedRecipeData.rewardAmounts.length == 1, "rewards amounts length incorrect").to.equal(true);
    });

    it('Add Multiple Recipes', async () => {
        await createContentContract();

        var newRecipe = [
            [
                1000000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ],
            [
                500000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 4]
                ],
                [2, 3], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [2] // array of reward amounts
            ]
        ];
        
        var results = await craft.addRecipeBatch(newRecipe);
        await expect(results)
                .to.emit(craft, 'RecipeAdded');
        var storedRecipeData = await craft.recipe(0);
        
        // check recipe 0
        expect(storedRecipeData.craftingRate == 1000000, "crafting rate incorrect").to.equal(true);
        expect(storedRecipeData.enabled == true, "recipe enabled incorrect").to.equal(true);
        expect(storedRecipeData.materials.length == 2, "materials length incorrect").to.equal(true);
        expect(storedRecipeData.materialAmounts.length == 2, "materials amounts length incorrect").to.equal(true);
        expect(storedRecipeData.rewards.length == 1, "rewards length incorrect").to.equal(true);
        expect(storedRecipeData.rewardAmounts.length == 1, "rewards amounts length incorrect").to.equal(true);
        
        // check recipe 1
        var storedRecipeData = await craft.recipe(1);
        
        expect(storedRecipeData.craftingRate == 500000, "crafting rate incorrect").to.equal(true);
        expect(storedRecipeData.enabled == false, "recipe enabled incorrect").to.equal(true);
        expect(storedRecipeData.materials.length == 2, "materials length incorrect").to.equal(true);
        expect(storedRecipeData.materials[0].content == content.address, "material 1 content contract incorrect").to.equal(true);
        expect(storedRecipeData.materials[1].content == content.address, "material 2 content contract incorrect").to.equal(true);
        expect(storedRecipeData.materials[0].tokenId == 2, "material 1 token incorrect").to.equal(true);
        expect(storedRecipeData.materials[1].tokenId == 4, "material 2 token incorrect").to.equal(true);
        expect(storedRecipeData.materialAmounts.length == 2, "materials amounts length incorrect").to.equal(true);
        expect(storedRecipeData.materialAmounts[0] == 2, "material 1 amount incorrect").to.equal(true);
        expect(storedRecipeData.materialAmounts[1] == 3, "material 2 amount incorrect").to.equal(true);
        expect(storedRecipeData.rewards.length == 1, "rewards length incorrect").to.equal(true);
        expect(storedRecipeData.rewards[0].content == content.address, "rewards content contract incorrect").to.equal(true);
        expect(storedRecipeData.rewards[0].tokenId == 6, "rewards 1 token incorrect").to.equal(true);
        expect(storedRecipeData.rewardAmounts.length == 1, "reward amounts length incorrect").to.equal(true);
        expect(storedRecipeData.rewardAmounts[0] == 2, "rewards amount incorrect").to.equal(true);
    });

    it('Failing to add Recipes', async () => {
        await createContentContract();

        // test invalid permission
        await expect(craft.connect(playerAddress).addRecipeBatch(initialRecipe), "Test Invalid Permission").to.be.reverted;

        // test invalid length
        await expect(craft.addRecipeBatch([], "Test Invalid Length")).to.be.reverted;

        // materials length mismatch
        var invalidRecipe = [
            [
                5000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ]
        ];
        await expect(craft.addRecipeBatch(invalidRecipe), "Test Materials Length Mismatch").to.be.reverted;

        // rewards length mismatch
        var invalidRecipe = [
            [
                500000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1, 1] // array of reward amounts
            ]
        ];
        await expect(craft.addRecipeBatch(invalidRecipe), "Test Rewards Length Mismatch").to.be.reverted;

        // invalid crafting rate
        var invalidRecipe = [
            [
                1100000, // crafting rate
                false, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ]
        ];
        await expect(craft.addRecipeBatch(invalidRecipe), "Test Invalid Crafting Rate").to.be.reverted;
    });

    it('Craft a recipe', async () => {
        await createContentContract();

        var results = await craft.addRecipeBatch(initialRecipe);
        await expect(results)
                .to.emit(craft, 'RecipeAdded');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false);

        // Approve craft contract as an operator
        await content.connect(playerAddress).setApprovalForAll(craft.address, true);

        var results = await craft.connect(playerAddress).craft(0, 1);
        await expect(results)
                .to.emit(craft, 'AssetsCrafted');
        
        expect(await content.balanceOf(playerAddress.address, 2) == 9, "Material was not burned.").to.equal(true);
        expect(await content.totalSupply(2) == 9, "Material supply is incorrect.").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 5) == 1, "Reward was not burned.").to.equal(true);
        expect(await content.totalSupply(5) == 1, "Reward supply is incorrect.").to.equal(true);
    });

    it('Craft multiple instances of a recipe', async () => {
        await createContentContract();

        var newRecipe = [
            [
                1000000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 3]
                ],
                [1, 1], // array of material amounts
                [   // array of reward asset data
                    [content.address, 5]
                ],
                [1] // array of reward amounts
            ],
            [
                1000000, // crafting rate
                true, // enabled
                [   // array of material asset data
                    [content.address, 2],
                    [content.address, 4]
                ],
                [2, 3], // array of material amounts
                [   // array of reward asset data
                    [content.address, 6]
                ],
                [2] // array of reward amounts
            ]
        ];

        var results = await craft.addRecipeBatch(newRecipe);
        await expect(results)
                .to.emit(craft, 'RecipeAdded');

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false);

        // Approve craft contract as an operator
        await content.connect(playerAddress).setApprovalForAll(craft.address, true);

        // Craft recipe 1
        var results = await craft.connect(playerAddress).craft(0, 3);
        await expect(results)
                .to.emit(craft, 'AssetsCrafted');
        
        expect(await content.balanceOf(playerAddress.address, 2) == 7, "Material 1 was not burned.").to.equal(true);
        expect(await content.totalSupply(2) == 7, "Material 1 supply is incorrect.").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 3) == 7, "Material 2 was not burned.").to.equal(true);
        expect(await content.totalSupply(3) == 7, "Material 2 supply is incorrect.").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 5) == 3, "Reward was not created.").to.equal(true);
        expect(await content.totalSupply(5) == 3, "Reward supply is incorrect.").to.equal(true);
        
        // Craft recipe 2
        var results = await craft.connect(playerAddress).craft(1, 2);
        await expect(results)
                .to.emit(craft, 'AssetsCrafted');
        
        expect(await content.balanceOf(playerAddress.address, 2) == 3, "Material 1 was not burned.").to.equal(true);
        expect(await content.totalSupply(2) == 3, "Material 1 supply is incorrect.").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 4) == 4, "Material 2 was not burned.").to.equal(true);
        expect(await content.totalSupply(4) == 4, "Material 2 supply is incorrect.").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 6) == 4, "Reward was not created.").to.equal(true);
        expect(await content.totalSupply(6) == 4, "Reward supply is incorrect.").to.equal(true);
    });

    it('Invalid Craft', async () => {
        await createContentContract();

        var results = await craft.addRecipeBatch(initialRecipe);
        await expect(results)
                .to.emit(craft, 'RecipeAdded');

        await expect(craft.connect(playerAddress).craft(1, 1), "Player has not approved craft as an operator yet.").to.be.reverted;

        // Approve craft contract as an operator
        await content.connect(playerAddress).setApprovalForAll(craft.address, true);

        // unpause the salvage contract so we can start salvaging assets
        await craft.managerSetPause(false);

        await expect(craft.connect(playerAddress).craft(1, 1), "Invalid id.").to.be.reverted;
        await expect(craft.connect(playerAddress).craft(0, 0), "Invalid amount.").to.be.reverted;
        await expect(craft.connect(playerAddress).craft(0, 11), "Player doesn't have enough assets to satisfy the crafting amount.").to.be.reverted;

        // disable the recipe
        await craft.managerSetPause(true);
        await craft.setRecipeEnabled(0, false);
        await craft.managerSetPause(false);
        await expect(craft.connect(playerAddress).craft(0, 1), "Invalid id.").to.be.reverted;
    });

});
