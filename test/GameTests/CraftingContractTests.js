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

    // it('Add Recipes', async () => {

    //     // Tests createRecipe()
    // });

    // it('Update Recipes', async () => {

    //     // Tests setRecipeActive()
    //     // Tests setRecipeActiveBatch()
    //     // Tests isRecipeActive()
    //     // Tests updateRecipeCost()
    //     // Tests updateRecipeCostBatch()
    //     // Tests getRecipeCost()
    // });

    // it('Get Crafting Materials for Recipe', async () => {

    //     // Tests getRewardsList(recipeId)
    // });

    // it('Get Crafting Rewards for Recipe', async () => {

    //     // Tests getRewardsList(recipeId)
    // });

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