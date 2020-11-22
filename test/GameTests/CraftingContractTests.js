const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const CraftingContract = artifacts.require("CraftingContract");
const OVCToken = artifacts.require("OVCToken");

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

    it('Check Crafting Contract Roles', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const cc_manager_role = 
            await craftingContract.MANAGER_ROLE();

        assert.equal(
            await craftingContract.hasRole(
                default_admin_role,
                deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                deployerAddress),
            true,
            "Deployer address does not have the crafting manager role");

        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        assert.equal(
            await game.hasRole(
                minter_role,
                craftingContract.address),
            true,
            "Crafting Contract does not have the burner role on Game " +
            "Contract");

        assert.equal(
            await game.hasRole(
                burner_role,
                craftingContract.address),
            true,
            "Crafting Contract does not have the burner role on Game " +
            "Contract");
    });

    it("Game Contract Data Setup", async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const gc_manager_role = await game.MANAGER_ROLE();
        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        // transfer the crafting contract ownership
        await craftingContract.transferOwnership(developerWalletAddress);
        
        await game.grantRole(gc_manager_role, gcManagerAddress,{from:deployerAddress});
        await game.grantRole(minter_role, gcManagerAddress,{from:deployerAddress});
        await game.grantRole(burner_role, gcManagerAddress,{from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await game.hasRole(
                gc_manager_role,
                gcManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Add 5 items
        await game.methods['createItem(uint256)'](material1, {from:gcManagerAddress});
        await game.methods['createItem(uint256)'](material2, {from:gcManagerAddress});
        await game.methods['createItem(uint256)'](material3, {from:gcManagerAddress});
        await game.methods['createItem(uint256)'](reward1, {from:gcManagerAddress});
        await game.methods['createItem(uint256)'](reward2, {from:gcManagerAddress});

        // Check if the new items were added.
        assert.equal(
            (await game.length()).toNumber(),
            5,
            "The 5 new items were not created"
        );
    });

    it('Add Crafting Materials', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();
        
        // Set crafting manager address the crafting manager role
        await craftingContract.grantRole(cc_manager_role, ccManagerAddress, {from:deployerAddress});
        
        // register a crafting material
        var event = await craftingContract.registerCraftingMaterial(game.address,material1,{from:ccManagerAddress});
        await craftingContract.registerCraftingMaterial(game.address,material2,{from:ccManagerAddress});
        await craftingContract.registerCraftingMaterial(game.address,material3,{from:ccManagerAddress});

        // Returns the crafting id hash
        craftItemId = event.logs[0].args[0].toString();

        // check if the item is registered correctly
        resultPair = await craftingContract.getGameContractId(
            craftItemId,
            {from:ccManagerAddress});
        
        assert.equal(
            resultPair[1],
            material1,
            "Game Id is incorrect."
        );
        assert.equal(
            resultPair[0],
            game.address,
            "Game Contract Address is incorrect."
        );

        // make sure all 3 items were added correctly
        assert.equal(
            (await craftingContract.getCraftItemsLength()).toNumber(),
            3,
            "The material items were not added correctly."
        );
    });

    it('Add Crafting Rewards', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();
        
        // Set crafting manager address the crafting manager role
        await craftingContract.grantRole(cc_manager_role, ccManagerAddress, {from:deployerAddress});
        
        // register a crafting material
        var event = await craftingContract.registerCraftingMaterial(game.address,reward1,{from:ccManagerAddress});
        await craftingContract.registerCraftingMaterial(game.address,reward2,{from:ccManagerAddress});

        // Returns the crafting id hash
        craftItemId = event.logs[0].args[0].toString();

        // check if the item is registered correctly
        resultPair = await craftingContract.getGameContractId(
            craftItemId,
            {from:ccManagerAddress});
        
        assert.equal(
            resultPair[1],
            reward1,
            "Game Id is incorrect."
        );
        assert.equal(
            resultPair[0],
            game.address,
            "Game Contract Address is incorrect."
        );

        // make sure all 3 items were added correctly
        assert.equal(
            (await craftingContract.getCraftItemsLength()).toNumber(),
            5,
            "The material items were not added correctly."
        );
    });

    it('Add Recipes', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role");
        
        // Get the craft item id for these items
        material1CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material1
        );
        material2CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material2
        );
        material3CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material3
        );
        reward1CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            reward1
        );
        reward2CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            reward2
        );

        // creating input for Recipe 0
        materialIds = [material1CraftItemId.toString(), material2CraftItemId.toString(), material3CraftItemId.toString()];
        materialAmounts = [1, 2, 10];
        rewardIds = [reward1CraftItemId.toString()];
        rewardAmounts = [1];
        
        var recipeCreatedEvent = await craftingContract.createRecipe(
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
        materialIds = [material1CraftItemId.toString(), material3CraftItemId.toString()];
        materialAmounts = [10, 10];
        rewardIds = [reward2CraftItemId.toString()];
        rewardAmounts = [1];
        
        recipeCreatedEvent = await craftingContract.createRecipe(
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
        materialIds = [material1CraftItemId.toString()];
        materialAmounts = [5];
        rewardIds = [reward2CraftItemId.toString()];
        rewardAmounts = [1];
        
        recipeCreatedEvent = await craftingContract.createRecipe(
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
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Test the Recipe Active functions
        await craftingContract.setRecipeActive(recipe2, true, {from:ccManagerAddress});
        assert.equal(
            await craftingContract.isRecipeActive(recipe2),
            true,
            "Recipe 2 was not set to active."
        );

        recipeIds = [recipe1, recipe2];
        recipesToActivate = [false, false];
        await craftingContract.setRecipeActiveBatch(recipeIds, recipesToActivate, {from:ccManagerAddress});

        assert.equal(
            await craftingContract.isRecipeActive(recipe1),
            false,
            "Recipe 1 was not set to inactive."
        );
        assert.equal(
            await craftingContract.isRecipeActive(recipe2),
            false,
            "Recipe 2 was not set to inactive."
        );
        assert.equal(
            await craftingContract.getActiveRecipesCount(),
            1,
            "Number of active recipes incorrect."
        );

        // Test the Recipe Cost functions
        await craftingContract.updateRecipeCost(recipe1, 300, {from:ccManagerAddress});
        assert.equal(
            await craftingContract.getRecipeCost(recipe1),
            300,
            "Recipe 1's cost was net set properly."
        );

        recipeIds = [recipe1, recipe2];
        recipeCosts = [0, 200];
        await craftingContract.updateRecipeCostBatch(recipeIds, recipeCosts, {from:ccManagerAddress});
        assert.equal(
            await craftingContract.getRecipeCost(recipe1),
            0,
            "Recipe 1's cost was net set properly."
        );
        assert.equal(
            await craftingContract.getRecipeCost(recipe2),
            200,
            "Recipe 2's cost was net set properly."
        );
    });

    it('Get Crafting Materials for Recipe', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        material1CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material1
        );
        material2CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material2
        );
        material3CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material3
        );

        // Get Rewards List
        results = await craftingContract.getCraftingMaterialsList(recipe0);
        ids = results[0];
        counts = results[1];

        assert.equal(ids.length, 3, "Recipe 0 did not have 3 materials required.");
        assert.equal(ids[0], material1CraftItemId.toString(), "Recipe 0 item material 1 Id is incorrect.");
        assert.equal(ids[1], material2CraftItemId.toString(), "Recipe 0 item material 2 Id is incorrect.");
        assert.equal(ids[2], material3CraftItemId.toString(), "Recipe 0 item material 3 Id is incorrect.");
        assert.equal(counts[0], 1, "Recipe 0 item material 1 required instances is incorrect");
        assert.equal(counts[1], 2, "Recipe 0 item material 2 required instances is incorrect");
        assert.equal(counts[2], 10, "Recipe 0 item material 3 required instances is incorrect");
    });

    it('Get Crafting Rewards for Recipe', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        reward1CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            reward1
        );

        // Get Rewards List
        results = await craftingContract.getRewardsList(recipe0);
        ids = results[0];
        counts = results[1];

        assert.equal(ids.length, 1, "Recipe 0 did not have 1 reward.");
        assert.equal(ids[0], reward1CraftItemId.toString(), "Recipe 0 item reward Id is incorrect.");
        assert.equal(counts[0], 1, "Recipe 0 item reward count is incorrect.");
    });

    it('Get List of Recipes that use specific crafting material', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Get All recipes that use Material 1
        recipeIds = await craftingContract.getItemAsCraftingMaterialList(
            game.address,
            material1
        );
        assert.equal(recipeIds.length, 3, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");
        assert.equal(recipeIds[1], recipe1, "Recipe 1 was not listed.");
        assert.equal(recipeIds[2], recipe2, "Recipe 2 was not listed.");

        // Get All recipes that use Material 3
        material3CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            material3
        );
        recipeIds = await craftingContract.getItemAsCraftingMaterialList(
            material3CraftItemId
        );
        assert.equal(recipeIds.length, 2, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");
        assert.equal(recipeIds[1], recipe1, "Recipe 1 was not listed.");
    });

    it('Get List of Recipes that reward specific crafting item', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Get All recipes that use Material 1
        recipeIds = await craftingContract.getItemAsRewardList(
            game.address,
            reward1
        );
        assert.equal(recipeIds.length, 1, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 0 was not listed.");

        // Get All recipes that use Material 3
        reward2CraftItemId = await craftingContract.getCraftItemId(
            game.address,
            reward2
        );
        recipeIds = await craftingContract.getItemAsRewardList(
            reward2CraftItemId
        );
        assert.equal(recipeIds.length, 2, "Incorrect number of recipes.");
        assert.equal(recipeIds[0], recipe1, "Recipe 1 was not listed.");
        assert.equal(recipeIds[1], recipe2, "Recipe 2 was not listed.");
    });

    it('Get All Active Recipes', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const cc_manager_role = await craftingContract.MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                cc_manager_role,
                ccManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        activeRecipesCount = await craftingContract.getActiveRecipesCount();
        assert.equal(activeRecipesCount, 1, "Incorrect number of active recipes.");

        recipeIds = await craftingContract.getActiveRecipes();
        assert.equal(recipeIds.length, 1, "Incorrect number of active recipes.");
        assert.equal(recipeIds[0], recipe0, "Recipe 1 was not listed.");
        
        recipeIds = [recipe1, recipe2];
        recipesToActivate = [true, true];
        await craftingContract.setRecipeActiveBatch(recipeIds, recipesToActivate, {from:ccManagerAddress});
        
        activeRecipesCount = await craftingContract.getActiveRecipesCount();
        assert.equal(activeRecipesCount, 3, "Incorrect number of active recipes.");
    });

    it('Craft an Item', async () => {
        const game = await Game.deployed();
        const craftingContract = await CraftingContract.deployed();
        const ovcToken = await OVCToken.deployed();
        const smith_role = await craftingContract.SMITH_ROLE();

        await craftingContract.grantRole(smith_role, smithAddress, {from:deployerAddress});
        await ovcToken.transfer(playerAddress, 300, {from:deployerAddress});
        assert.equal(await ovcToken.balanceOf(playerAddress), 300, "Player was not sent 300 OVC Tokens.");

        // mint materials and give to player
        itemIds = [material1, material2, material3];
        amounts = [6, 2, 10];
        await game.mintBatch(playerAddress, itemIds, amounts, {from:gcManagerAddress, gasPrice: 1});

        // craft recipe 0 for player
        await craftingContract.craftItem(recipe0, playerAddress, {from:smithAddress});
        
        // Check to see item was minted and sent to the player
        accountIds = [playerAddress, playerAddress, playerAddress, playerAddress];
        itemIds = [reward1, material1, material2, material3];
        balances = await game.balanceOfBatch(accountIds, itemIds);
        assert.equal(balances[0], 1, "Reward Item was not created.");
        assert.equal(balances[1], 5, "Material 1 was not burned.");
        assert.equal(balances[2], 0, "Material 2 was not burned.");
        assert.equal(balances[3], 0, "Material 3 was not burned.");

        // Player must approve Crafting Contract for the specified recipe cost
        cost = await craftingContract.getRecipeCost(recipe2);
        tokenAddress = await craftingContract.getTokenAddressForCrafting();
        assert.equal(tokenAddress.toString(), ovcToken.address, "Token Addresses are not the same.");
        assert.equal(await ovcToken.balanceOf(playerAddress), 300, "balance is 300.");
        assert.equal(cost, 200, "Cost is 200.");
        ovcToken.approve(craftingContract.address, cost, {from: playerAddress, gasPrice: 1}); 

        // craft recipe 2 for player
        await craftingContract.craftItem(recipe2, playerAddress, {from:smithAddress});
        assert.equal(await game.balanceOf(playerAddress, reward2), 1, "Reward Item was not created.");
        assert.equal(await game.balanceOf(playerAddress, material1), 0, "Material 1 was not burned.");
        assert.equal(await ovcToken.balanceOf(playerAddress), 100, "Recipe did not consume 200 OVC Tokens.");
        assert.equal(
            await ovcToken.balanceOf(developerWalletAddress),
            200,
            "200 OVC tokens were not sent to the developer wallet as crafting payment.");
    });
});