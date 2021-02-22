const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const Crafting = artifacts.require("Crafting");
const CraftingManager = artifacts.require("CraftingManager");
const CraftingFactory = artifacts.require("CraftingFactory");
const ManagerFactory = artifacts.require("ManagerFactory");
const RawrToken = artifacts.require("RawrToken");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

contract('Crafting Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        ccManagerAddress,           // Developer Address for managing the Crafting Contract
        playerAddress,              // Player Address
        developerWalletAddress      // Developer Wallet Address
    ] = accounts;
    const [material1, material2, material3, reward1, reward2] = [0,1,2,3,4];
    const [recipe0, recipe1, recipe2] = [0,1,2];
    const zero_address = "0x0000000000000000000000000000000000000000";
    var game, gameManager, rawrToken, itemRegistry;
    var crafting, craftingManager;
    var default_admin_role, manager_role, minter_role, burner_role;
    var material1UUID, material2UUID, material3UUID, reward1UUID, reward2UUID;

    it('Setup', async () => {
        itemRegistry = await GlobalItemRegistry.deployed();

        // Setup Manager Factory
        managerFactory = await ManagerFactory.deployed();

        // Setup Game Factory
        gameFactory = await GameFactory.deployed();
        await gameFactory.setGlobalItemRegistryAddr(itemRegistry.address);

        // Setup Game Manager
        gameManagerCreatedEvent = await managerFactory.createGameManagerContract();
        gameManagerAddress = gameManagerCreatedEvent.logs[0].args[1];
        gameManager = await GameManager.at(gameManagerAddress);
        gameCreatedEvents = await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");
        game = await Game.at(gameCreatedEvents.logs[2].args[1]);

        // Setup Crafting Factory
        craftingFactory = await CraftingFactory.deployed();
        await craftingFactory.setGlobalItemRegistryAddr(itemRegistry.address);
        
        // Setup Crafting Manager
        craftingManagerCreatedEvent = await managerFactory.createCraftingManagerContract();
        craftingManagerAddress = craftingManagerCreatedEvent.logs[0].args[1];
        craftingManager = await CraftingManager.at(craftingManagerAddress);
        craftingCreatedEvents = await craftingManager.generateCraftingContract(craftingFactory.address);
        crafting = await Crafting.at(craftingCreatedEvents.logs[2].args[1]);
        await craftingManager.setGlobalItemRegistryAddr(itemRegistry.address);
        await craftingManager.setDeveloperWallet(developerWalletAddress);
        
        // set token
        rawrToken = await RawrToken.deployed();
        
        await rawrToken.transfer(playerAddress, 300, {from:deployerAddress});
        assert.equal(await rawrToken.balanceOf(playerAddress), 300, "Player was not sent 300 RAWR Tokens.");
    });

    
    it('Check Crafting Contract Roles', async () => {
        default_admin_role = await craftingManager.DEFAULT_ADMIN_ROLE();
        manager_role = await craftingManager.MANAGER_ROLE();

        assert.equal(
            await craftingManager.hasRole(
                default_admin_role,
                deployerAddress),
            true,
            "Deployer address does not have the default admin role"
        );
            
        assert.equal(
            await craftingManager.hasRole(
                manager_role,
                deployerAddress),
            true,
            "Deployer address does not have the crafting manager role"
        );

        minter_role = await gameManager.MINTER_ROLE();
        burner_role = await gameManager.BURNER_ROLE();

        await gameManager.grantRole(minter_role, crafting.address, {from:deployerAddress});
        await gameManager.grantRole(burner_role, crafting.address, {from:deployerAddress});

        assert.equal(
            await gameManager.hasRole(
                minter_role,
                crafting.address),
            true,
            "Crafting Manager Contract does not have the minter role on Game Manager Contract"
        );

        assert.equal(
            await gameManager.hasRole(
                burner_role,
                crafting.address),
            true,
            "Crafting Manager Contract does not have the burner role on Game Manager Contract"
        );
        
        await gameManager.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await gameManager.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});
        
        // Set crafting manager address the crafting manager role
        await craftingManager.grantRole(manager_role, ccManagerAddress, {from:deployerAddress});
    });

    it("Game Contract Data Setup", async () => {
        // Add 5 items
        await gameManager.createItem(deployerAddress, material1, 0, {from:deployerAddress});
        await gameManager.createItem(deployerAddress, material2, 0, {from:deployerAddress});
        await gameManager.createItem(deployerAddress, material3, 0, {from:deployerAddress});
        await gameManager.createItem(deployerAddress, reward1, 0, {from:deployerAddress});
        await gameManager.createItem(deployerAddress, reward2, 0, {from:deployerAddress});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 5, "The 5 new items were not created");
        
        // make sure all 5 items were added correctly
        assert.equal(await itemRegistry.length(), 5, "The items were not added correctly.");
    });

    it('Add Crafting Materials', async () => {
        // Checks whether the materials were registered in the global item registry
        material1UUID = await itemRegistry.getUUID(game.address, material1);
        material2UUID = await itemRegistry.getUUID(game.address, material2);
        material3UUID = await itemRegistry.getUUID(game.address, material3);
        assert.equal(await itemRegistry.contains(material1UUID), true, "Material 1 was not registered.");
        assert.equal(await itemRegistry.contains(material2UUID), true, "Material 2 was not registered.");
        assert.equal(await itemRegistry.contains(material3UUID), true, "Material 3 was not registered.");
    });

    it('Add Crafting Rewards', async () => {
        reward1UUID = await itemRegistry.getUUID(game.address, reward1);
        reward2UUID = await itemRegistry.getUUID(game.address, reward2);
        assert.equal(await itemRegistry.contains(reward1UUID), true, "Reward 1 was not registered.");
        assert.equal(await itemRegistry.contains(reward2UUID), true, "Reward 2 was not registered.");
    });

    it('Add Recipes', async () => {
        // creating input for Recipe 0
        materialIds = [material1UUID, material2UUID, material3UUID];
        materialAmounts = [1, 2, 10];
        rewardIds = [reward1UUID.toString()];
        rewardAmounts = [1];
        
        assert.equal(await crafting.exists(recipe0), false, "Recipe 1 shouldn't exist yet.");
        var recipeCreatedEvent = await craftingManager.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            rawrToken.address,
            0,
            true,
            {from:ccManagerAddress}
        );
        assert.equal(await crafting.exists(recipe0), true, "Recipe 1 shouldn't exist yet.");
      
        // creating input for Recipe 1
        materialIds = [material1UUID.toString(), material3UUID.toString()];
        materialAmounts = [10, 10];
        rewardIds = [reward2UUID.toString()];
        rewardAmounts = [1];
        
        assert.equal(await crafting.exists(recipe1), false, "Recipe 1 shouldn't exist yet.");
        recipeCreatedEvent = await craftingManager.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            rawrToken.address,
            0,
            true,
            {from:ccManagerAddress}
        );
        assert.equal(await crafting.exists(recipe1), true, "Recipe 1 shouldn't exist yet.");

        // creating input for Recipe 2
        materialIds = [material1UUID.toString()];
        materialAmounts = [5];
        rewardIds = [reward2UUID.toString()];
        rewardAmounts = [1];
        
        assert.equal(await crafting.exists(recipe2), false, "Recipe 2 shouldn't exist yet.");
        recipeCreatedEvent = await craftingManager.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            rawrToken.address,
            100,
            false,
            {from:ccManagerAddress}
        );
        assert.equal(await crafting.exists(recipe2), true, "Recipe 2 shouldn't exist yet.");
    });

    it('Update Recipes', async () => {
        // Test the Recipe Active functions
        await craftingManager.updateRecipeActive(recipe2, true, {from:ccManagerAddress});
        assert.equal(
            await crafting.isRecipeActive(recipe2),
            true,
            "Recipe 2 was not set to active."
        );

        await craftingManager.updateRecipeActive(recipe1, false, {from:ccManagerAddress});
        await craftingManager.updateRecipeActive(recipe2, false, {from:ccManagerAddress});

        assert.equal(
            await crafting.isRecipeActive(recipe1),
            false,
            "Recipe 1 was not set to inactive."
        );
        assert.equal(
            await crafting.isRecipeActive(recipe2),
            false,
            "Recipe 2 was not set to inactive."
        );
        assert.equal(
            await crafting.getActiveRecipeCount(),
            1,
            "Number of active recipes incorrect."
        );

        // Test the Recipe Cost functions
        await craftingManager.updateRecipeCost(recipe1, rawrToken.address, 300, {from:ccManagerAddress});
        result = await crafting.getRecipeCost(recipe1);
        assert.equal(
            result[1],
            300,
            "Recipe 1's cost was net set properly."
        );

        await craftingManager.updateRecipeCost(recipe1, rawrToken.address, 0, {from:ccManagerAddress});
        await craftingManager.updateRecipeCost(recipe2, rawrToken.address, 200, {from:ccManagerAddress});
        result = await crafting.getRecipeCost(recipe1);
        assert.equal(
            result[1],
            0,
            "Recipe 1's cost was net set properly."
        );
        result = await crafting.getRecipeCost(recipe2);
        assert.equal(
            result[1],
            200,
            "Recipe 2's cost was net set properly."
        );
    });

    it('Get Crafting Materials for Recipe', async () => {
        // Get Rewards List
        results = await crafting.getCraftingMaterialsList(recipe0);
        ids = results[0];
        counts = results[1];

        assert.equal(ids.length, 3, "Recipe 0 did not have 3 materials required.");
        assert.equal(ids[0], material1UUID.toString(), "Recipe 0 item material 1 Id is incorrect.");
        assert.equal(ids[1], material2UUID.toString(), "Recipe 0 item material 2 Id is incorrect.");
        assert.equal(ids[2], material3UUID.toString(), "Recipe 0 item material 3 Id is incorrect.");
        assert.equal(counts[0], 1, "Recipe 0 item material 1 required instances is incorrect");
        assert.equal(counts[1], 2, "Recipe 0 item material 2 required instances is incorrect");
        assert.equal(counts[2], 10, "Recipe 0 item material 3 required instances is incorrect");
    });

    it('Get Crafting Rewards for Recipe', async () => {
        // Get Rewards List
        results = await crafting.getRewardsList(recipe0);
        ids = results[0];
        counts = results[1];

        assert.equal(ids.length, 1, "Recipe 0 did not have 1 reward.");
        assert.equal(ids[0], reward1UUID.toString(), "Recipe 0 item reward Id is incorrect.");
        assert.equal(counts[0], 1, "Recipe 0 item reward count is incorrect.");
    });

    it('Check Active Recipes', async () => {
        activeRecipesCount = await crafting.getActiveRecipeCount();
        assert.equal(activeRecipesCount, 1, "Incorrect number of active recipes.");
        
        await craftingManager.updateRecipeActive(recipe1, true, {from:ccManagerAddress});
        await craftingManager.updateRecipeActive(recipe2, true, {from:ccManagerAddress});
        
        activeRecipesCount = await crafting.getActiveRecipeCount();
        assert.equal(activeRecipesCount, 3, "Incorrect number of active recipes.");
    });

    it('Craft an Item', async () => {
        // mint materials and give to player
        itemIds = [material1, material2, material3];
        amounts = [6, 2, 10];
        await gameManager.mintBatch(playerAddress, itemIds, amounts, {from:gcManagerAddress, gasPrice: 1});

        // craft recipe 0 for player
        await crafting.craftItem(recipe0, playerAddress, {from:playerAddress});
        
        // Check to see item was minted and sent to the player
        accountIds = [playerAddress, playerAddress, playerAddress, playerAddress];
        itemIds = [reward1, material1, material2, material3];
        balances = await game.balanceOfBatch(accountIds, itemIds);
        assert.equal(balances[0], 1, "Reward Item was not created.");
        assert.equal(balances[1], 5, "Material 1 was not burned.");
        assert.equal(balances[2], 0, "Material 2 was not burned.");
        assert.equal(balances[3], 0, "Material 3 was not burned.");

        // Player must approve Crafting Contract for the specified recipe cost
        result = await crafting.getRecipeCost(recipe2);
        tokenAddress = result[0];
        cost = result[1];
        assert.equal(tokenAddress.toString(), rawrToken.address, "Token Addresses are not the same.");
        assert.equal(await rawrToken.balanceOf(playerAddress), 300, "balance is 300.");
        assert.equal(cost, 200, "Cost is 200.");
        await rawrToken.approve(crafting.address, cost, {from: playerAddress, gasPrice: 1}); 

        // craft recipe 2 for player
        await crafting.craftItem(recipe2, playerAddress, {from:playerAddress});
        assert.equal(await game.balanceOf(playerAddress, reward2), 1, "Reward Item was not created.");
        assert.equal(await game.balanceOf(playerAddress, material1), 0, "Material 1 was not burned.");
        assert.equal(await rawrToken.balanceOf(playerAddress), 100, "Recipe did not consume 200 RAWR Tokens.");
        assert.equal(
            await rawrToken.balanceOf(developerWalletAddress),
            200,
            "200 RAWR tokens were not sent to the developer wallet as crafting payment.");
    });
});