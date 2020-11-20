const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");
const CraftingContract = artifacts.require("CraftingContract");

// const w3utils = require('web3-utils'); // todo: delete

// /**
//  * Converts a string into a hex representation of bytes32, with right padding
//  */
// const toBytes32 = key => w3utils.rightPad(w3utils.asciiToHex(key), 64);

contract('Crafting Contract', (accounts) => {
    const [deployerAddress, itemManagerAddress, craftingManagerAddress] = accounts;
    const [material1, material2, material3, reward1, reward2] = [1,2,3,4,5];
    const [recipe0, recipe1, recipe2] = [0,1,2];

    it('Check Crafting Contract Roles', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();

        assert.equal(
            await craftingContract.hasRole(
                default_admin_role,
                deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                deployerAddress),
            true,
            "Deployer address does not have the crafting manager role");

        
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        assert.equal(
            await gameContract.hasRole(
                minter_role,
                craftingContract.address),
            true,
            "Crafting Contract does not have the burner role on Game " +
            "Contract");

        assert.equal(
            await gameContract.hasRole(
                burner_role,
                craftingContract.address),
            true,
            "Crafting Contract does not have the burner role on Game " +
            "Contract");
    });

    it("Game Contract Data Setup", async () => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();
        
        await gameContract.grantRole(item_manager_role, itemManagerAddress,{from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Add 5 items
        await gameContract.methods['createItem(uint256)'](material1, {from:itemManagerAddress});
        await gameContract.methods['createItem(uint256)'](material2, {from:itemManagerAddress});
        await gameContract.methods['createItem(uint256)'](material3, {from:itemManagerAddress});
        await gameContract.methods['createItem(uint256)'](reward1, {from:itemManagerAddress});
        await gameContract.methods['createItem(uint256)'](reward2, {from:itemManagerAddress});

        // Check if the new items were added.
        assert.equal(
            (await gameContract.length()).toNumber(),
            5,
            "The 5 new items were not created"
        );
    });

    it('Add Crafting Materials', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();
        
        // Set crafting manager address the crafting manager role
        await craftingContract.grantRole(crafting_manager_role, craftingManagerAddress, {from:deployerAddress});
        
        // register a crafting material
        var event = await craftingContract.registerCraftingMaterial(gameContract.address,material1,{from:craftingManagerAddress});
        await craftingContract.registerCraftingMaterial(gameContract.address,material2,{from:craftingManagerAddress});
        await craftingContract.registerCraftingMaterial(gameContract.address,material3,{from:craftingManagerAddress});

        // Returns the crafting id hash
        craftItemId = event.logs[0].args[0].toString();

        // check if the item is registered correctly
        resultPair = await craftingContract.getGameContractId(
            craftItemId,
            {from:craftingManagerAddress});
        
        assert.equal(
            resultPair[1],
            material1,
            "Game Id is incorrect."
        );
        assert.equal(
            resultPair[0],
            gameContract.address,
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
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();
        
        // Set crafting manager address the crafting manager role
        await craftingContract.grantRole(crafting_manager_role, craftingManagerAddress, {from:deployerAddress});
        
        // register a crafting material
        var event = await craftingContract.registerCraftingMaterial(gameContract.address,reward1,{from:craftingManagerAddress});
        await craftingContract.registerCraftingMaterial(gameContract.address,reward2,{from:craftingManagerAddress});

        // Returns the crafting id hash
        craftItemId = event.logs[0].args[0].toString();

        // check if the item is registered correctly
        resultPair = await craftingContract.getGameContractId(
            craftItemId,
            {from:craftingManagerAddress});
        
        assert.equal(
            resultPair[1],
            reward1,
            "Game Id is incorrect."
        );
        assert.equal(
            resultPair[0],
            gameContract.address,
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
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                craftingManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role");
        
        // Get the craft item id for these items
        material1CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            material1
        );
        material2CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            material2
        );
        material3CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            material3
        );
        reward1CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            reward1
        );
        reward2CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
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
            {from:craftingManagerAddress}
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
            {from:craftingManagerAddress}
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
            {from:craftingManagerAddress}
        );

        recipeId = recipeCreatedEvent.logs[0].args[0].toNumber();
        assert.equal(recipeId, recipe2, "Recipe 2 is was not added correctly.");
        
        // console.log("ID: " + recipeCreatedEvent.logs[0].args[0].toNumber());

    });

    it('Update Recipes', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                craftingManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        // Test the Recipe Active functions
        await craftingContract.setRecipeActive(recipe2, true, {from:craftingManagerAddress});
        assert.equal(
            await craftingContract.isRecipeActive(recipe2),
            true,
            "Recipe 2 was not set to active."
        );

        recipeIds = [recipe1, recipe2];
        recipesToActivate = [false, false];
        await craftingContract.setRecipeActiveBatch(recipeIds, recipesToActivate, {from:craftingManagerAddress});

        isRecipeActive = await craftingContract.isRecipeActive(recipe1);
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
        await craftingContract.updateRecipeCost(recipe1, 300, {from:craftingManagerAddress});
        assert.equal(
            await craftingContract.getRecipeCost(recipe1),
            300,
            "Recipe 1's cost was net set properly."
        );

        recipeIds = [recipe1, recipe2];
        recipeCosts = [0, 200];
        await craftingContract.updateRecipeCostBatch(recipeIds, recipeCosts, {from:craftingManagerAddress});
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
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                craftingManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        material1CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            material1
        );
        material2CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
            material2
        );
        material3CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
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
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();

        // check proper role set to crafting manager address
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                craftingManagerAddress),
            true,
            "Crafting Manager Address does not have the crafting manager role"
        );

        reward1CraftItemId = await craftingContract.getCraftItemId(
            gameContract.address,
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

    // it('Get List of Recipes that use specific crafting material', async () => {
        
    //     // Tests getItemAsCraftingMaterialList(contract, itemId);
    //     // Tests getItemAsCraftingMaterialList(craftId)
    // });

    // it('Get List of Recipes that reward specific crafting item', async () => {

    //     // Tests getItemAsRewardList(contract, itemId);
    //     // Tests getItemAsRewardList(craftId)
    // });

    // it('Get All Active Recipes', async () => {

    //     // Tests getActiveRecipes();
    //     // Tests getActiveRecipesCount();
    // });

    // it('Craft an Item', async () => {
    // });
});