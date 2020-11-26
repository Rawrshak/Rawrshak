const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const Crafting = artifacts.require("Crafting");
const OVCToken = artifacts.require("OVCToken");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

// const w3utils = require('web3-utils'); // todo: delete

// /**
//  * Converts a string into a hex representation of bytes32, with right padding
//  */
// const toBytes32 = key => w3utils.rightPad(w3utils.asciiToHex(key), 64);

contract('Crafting Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        ccManagerAddress,           // Developer Address for managing the Crafting Contract
        smithAddress,               // Crafting Service Address
        playerAddress,              // Player Address
        developerWalletAddress      // Developer Wallet Address
    ] = accounts;
    const [material1, material2, material3, reward1, reward2] = [0,1,2,3,4];
    const [recipe0, recipe1, recipe2] = [0,1,2];
    const zero_address = "0x0000000000000000000000000000000000000000";

    it('Check Crafting Contract Roles', async () => {
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const default_admin_role = await crafting.DEFAULT_ADMIN_ROLE();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        assert.equal(
            await crafting.hasRole(
                default_admin_role,
                deployerAddress),
            true,
            "Deployer address does not have the default admin role"
        );
            
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                deployerAddress),
            true,
            "Deployer address does not have the crafting manager role"
        );

        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        assert.equal(
            await game.hasRole(
                minter_role,
                crafting.address),
            true,
            "Crafting Contract does not have the burner role on Game Contract"
        );

        assert.equal(
            await game.hasRole(
                burner_role,
                crafting.address),
            true,
            "Crafting Contract does not have the burner role on Game Contract"
        );
    });

    it("Game Contract Data Setup", async () => {
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const gc_manager_role = await game.MANAGER_ROLE();
        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // transfer the crafting contract ownership
        await crafting.transferOwnership(developerWalletAddress);
        
        await game.grantRole(gc_manager_role, gcManagerAddress,{from:deployerAddress});
        await game.grantRole(minter_role, gcManagerAddress,{from:deployerAddress});
        await game.grantRole(burner_role, gcManagerAddress,{from:deployerAddress});
        
        // Set crafting manager address the crafting manager role
        await crafting.grantRole(cc_manager_role, ccManagerAddress, {from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await game.hasRole(
                gc_manager_role,
                gcManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Add 5 items
        await game.createItem(zero_address, material1, 0, {from:gcManagerAddress});
        await game.createItem(zero_address, material2, 0, {from:gcManagerAddress});
        await game.createItem(zero_address, material3, 0, {from:gcManagerAddress});
        await game.createItem(zero_address, reward1, 0, {from:gcManagerAddress});
        await game.createItem(zero_address, reward2, 0, {from:gcManagerAddress});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 5, "The 5 new items were not created");
        
        // make sure all 5 items were added correctly
        assert.equal(await registry.length(), 5, "The items were not added correctly.");
    });

    it('Add Crafting Materials', async () => {
        const game = await Game.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // Checks whether the materials were registered in the global item registry
        material1UUID = await registry.getUUID(game.address, material1);
        material2UUID = await registry.getUUID(game.address, material2);
        material3UUID = await registry.getUUID(game.address, material3);
        assert.equal(await registry.contains(material1UUID), true, "Material 1 was not registered.");
        assert.equal(await registry.contains(material2UUID), true, "Material 2 was not registered.");
        assert.equal(await registry.contains(material3UUID), true, "Material 3 was not registered.");
    });

    it('Add Crafting Rewards', async () => {
        const game = await Game.deployed();
        const registry = await GlobalItemRegistry.deployed();

        reward1UUID = await registry.getUUID(game.address, reward1);
        reward2UUID = await registry.getUUID(game.address, reward2);
        assert.equal(await registry.contains(reward1UUID), true, "Reward 1 was not registered.");
        assert.equal(await registry.contains(reward2UUID), true, "Reward 2 was not registered.");
    });

    it('Add Recipes', async () => {
        const game = await Game.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const crafting = await Crafting.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role");
        
        // Get the craft item id for these items
        material1UUID = await registry.getUUID(game.address, material1);
        material2UUID = await registry.getUUID(game.address, material2);
        material3UUID = await registry.getUUID(game.address, material3);
        reward1UUID = await registry.getUUID(game.address, reward1);
        reward2UUID = await registry.getUUID(game.address, reward2);

        // creating input for Recipe 0
        materialIds = [material1UUID.toString(), material2UUID.toString(), material3UUID.toString()];
        materialAmounts = [1, 2, 10];
        rewardIds = [reward1UUID.toString()];
        rewardAmounts = [1];
        
        var recipeCreatedEvent = await crafting.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            0,
            true,
            {from:ccManagerAddress}
        );

        recipeId = recipeCreatedEvent.logs[0].args[0].toNumber();
        assert.equal(recipeId, recipe0, "Recipe 0 is was not added correctly.");
      
        // creating input for Recipe 1
        materialIds = [material1UUID.toString(), material3UUID.toString()];
        materialAmounts = [10, 10];
        rewardIds = [reward2UUID.toString()];
        rewardAmounts = [1];
        
        recipeCreatedEvent = await crafting.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            0,
            true,
            {from:ccManagerAddress}
        );

        recipeId = recipeCreatedEvent.logs[0].args[0].toNumber();
        assert.equal(recipeId, recipe1, "Recipe 1 is was not added correctly.");

        // creating input for Recipe 2
        materialIds = [material1UUID.toString()];
        materialAmounts = [5];
        rewardIds = [reward2UUID.toString()];
        rewardAmounts = [1];
        
        recipeCreatedEvent = await crafting.createRecipe(
            materialIds,
            materialAmounts,
            rewardIds,
            rewardAmounts,
            100,
            false,
            {from:ccManagerAddress}
        );

        recipeId = recipeCreatedEvent.logs[0].args[0].toNumber();
        assert.equal(recipeId, recipe2, "Recipe 2 is was not added correctly.");
        
        // console.log("ID: " + recipeCreatedEvent.logs[0].args[0].toNumber());

    });

    it('Update Recipes', async () => {
        const crafting = await Crafting.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Test the Recipe Active functions
        await crafting.setRecipeActive(recipe2, true, {from:ccManagerAddress});
        assert.equal(
            await crafting.isRecipeActive(recipe2),
            true,
            "Recipe 2 was not set to active."
        );

        recipeIds = [recipe1, recipe2];
        recipesToActivate = [false, false];
        await crafting.setRecipeActiveBatch(recipeIds, recipesToActivate, {from:ccManagerAddress});

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
            await crafting.getActiveRecipesCount(),
            1,
            "Number of active recipes incorrect."
        );

        // Test the Recipe Cost functions
        await crafting.updateRecipeCost(recipe1, 300, {from:ccManagerAddress});
        assert.equal(
            await crafting.getRecipeCost(recipe1),
            300,
            "Recipe 1's cost was net set properly."
        );

        recipeIds = [recipe1, recipe2];
        recipeCosts = [0, 200];
        await crafting.updateRecipeCostBatch(recipeIds, recipeCosts, {from:ccManagerAddress});
        assert.equal(
            await crafting.getRecipeCost(recipe1),
            0,
            "Recipe 1's cost was net set properly."
        );
        assert.equal(
            await crafting.getRecipeCost(recipe2),
            200,
            "Recipe 2's cost was net set properly."
        );
    });

    it('Get Crafting Materials for Recipe', async () => {
        const game = await Game.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const crafting = await Crafting.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        material1UUID = await registry.getUUID(game.address, material1);
        material2UUID = await registry.getUUID(game.address, material2);
        material3UUID = await registry.getUUID(game.address, material3);

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
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        reward1UUID = await registry.getUUID(game.address, reward1);

        // Get Rewards List
        results = await crafting.getRewardsList(recipe0);
        ids = results[0];
        counts = results[1];

        assert.equal(ids.length, 1, "Recipe 0 did not have 1 reward.");
        assert.equal(ids[0], reward1UUID.toString(), "Recipe 0 item reward Id is incorrect.");
        assert.equal(counts[0], 1, "Recipe 0 item reward count is incorrect.");
    });

    it('Get List of Recipes that use specific crafting material', async () => {
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Get All recipes that use Material 1
        material1UUID = await registry.getUUID(game.address, material1);
        recipeIds = await crafting.getItemAsCraftingMaterialList(material1UUID);

        assert.equal(recipeIds.length, 3, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");
        assert.equal(recipeIds[1], recipe1, "Recipe 1 was not listed.");
        assert.equal(recipeIds[2], recipe2, "Recipe 2 was not listed.");

        // Get All recipes that use Material 3
        material3UUID = await registry.getUUID(game.address, material3);
        recipeIds = await crafting.getItemAsCraftingMaterialList(material3UUID);

        assert.equal(recipeIds.length, 2, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");
        assert.equal(recipeIds[1], recipe1, "Recipe 1 was not listed.");
    });

    it('Get List of Recipes that reward specific crafting item', async () => {
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Get All recipes that return reward 1
        reward1UUID = await registry.getUUID(game.address, reward1);
        recipeIds = await crafting.getItemAsRewardList(reward1UUID);
        assert.equal(recipeIds.length, 1, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");

        // Get All recipes that return reward 2
        reward2UUID = await registry.getUUID(game.address, reward2);
        recipeIds = await crafting.getItemAsRewardList(reward2UUID);
        assert.equal(recipeIds.length, 2, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe1, "Recipe 1 was not listed.");
        assert.equal(recipeIds[1], recipe2, "Recipe 2 was not listed.");
    });

    it('Get All Active Recipes', async () => {
        const crafting = await Crafting.deployed();
        const cc_manager_role = await crafting.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await crafting.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        activeRecipesCount = await crafting.getActiveRecipesCount();
        assert.equal(activeRecipesCount, 1, "Incorrect number of active recipes.");

        recipeIds = await crafting.getActiveRecipes();
        assert.equal(recipeIds.length, 1, "Incorrect number of active recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 1 was not listed.");
        
        recipeIds = [recipe1, recipe2];
        recipesToActivate = [true, true];
        await crafting.setRecipeActiveBatch(recipeIds, recipesToActivate, {from:ccManagerAddress});
        
        activeRecipesCount = await crafting.getActiveRecipesCount();
        assert.equal(activeRecipesCount, 3, "Incorrect number of active recipes.");
    });

    it('Craft an Item', async () => {
        const game = await Game.deployed();
        const crafting = await Crafting.deployed();
        const ovcToken = await OVCToken.deployed();
        const smith_role = await crafting.SMITH_ROLE();

        await crafting.grantRole(smith_role, smithAddress, {from:deployerAddress});
        await ovcToken.transfer(playerAddress, 300, {from:deployerAddress});
        assert.equal(await ovcToken.balanceOf(playerAddress), 300, "Player was not sent 300 OVC Tokens.");

        // mint materials and give to player
        itemIds = [material1, material2, material3];
        amounts = [6, 2, 10];
        await game.mintBatch(playerAddress, itemIds, amounts, {from:gcManagerAddress, gasPrice: 1});

        // craft recipe 0 for player
        await crafting.craftItem(recipe0, playerAddress, {from:smithAddress});
        
        // Check to see item was minted and sent to the player
        accountIds = [playerAddress, playerAddress, playerAddress, playerAddress];
        itemIds = [reward1, material1, material2, material3];
        balances = await game.balanceOfBatch(accountIds, itemIds);
        assert.equal(balances[0], 1, "Reward Item was not created.");
        assert.equal(balances[1], 5, "Material 1 was not burned.");
        assert.equal(balances[2], 0, "Material 2 was not burned.");
        assert.equal(balances[3], 0, "Material 3 was not burned.");

        // Player must approve Crafting Contract for the specified recipe cost
        cost = await crafting.getRecipeCost(recipe2);
        tokenAddress = await crafting.getTokenAddressForCrafting();
        assert.equal(tokenAddress.toString(), ovcToken.address, "Token Addresses are not the same.");
        assert.equal(await ovcToken.balanceOf(playerAddress), 300, "balance is 300.");
        assert.equal(cost, 200, "Cost is 200.");
        ovcToken.approve(crafting.address, cost, {from: playerAddress, gasPrice: 1}); 

        // craft recipe 2 for player
        await crafting.craftItem(recipe2, playerAddress, {from:smithAddress});
        assert.equal(await game.balanceOf(playerAddress, reward2), 1, "Reward Item was not created.");
        assert.equal(await game.balanceOf(playerAddress, material1), 0, "Material 1 was not burned.");
        assert.equal(await ovcToken.balanceOf(playerAddress), 100, "Recipe did not consume 200 OVC Tokens.");
        assert.equal(
            await ovcToken.balanceOf(developerWalletAddress),
            200,
            "200 OVC tokens were not sent to the developer wallet as crafting payment.");
    });
});