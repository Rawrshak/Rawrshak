const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");
const CraftingContract = artifacts.require("CraftingContract");

// const w3utils = require('web3-utils'); // todo: delete

// /**
//  * Converts a string into a hex representation of bytes32, with right padding
//  */
// const toBytes32 = key => w3utils.rightPad(w3utils.asciiToHex(key), 64);

contract('Crafting Contract', (accounts) => {
    const deployerAddress = accounts[0];
    const itemManagerAddress = accounts[1];
    const craftingManagerAddress = accounts[2];

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
        
        await gameContract.grantRole(item_manager_role, itemManagerAddress,{from:deployerAddress, gasPrice: 1});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Add 5 items
        await gameContract.methods['createItem(uint256)'](1, {from:itemManagerAddress, gasPrice: 1});
        await gameContract.methods['createItem(uint256)'](
            2,
            {from:itemManagerAddress, gasPrice: 1}
        );
        await gameContract.methods['createItem(uint256)'](
            3,
            {from:itemManagerAddress, gasPrice: 1}
        );
        await gameContract.methods['createItem(uint256)'](
            4,
            {from:itemManagerAddress, gasPrice: 1}
        );
        await gameContract.methods['createItem(uint256)'](
            5,
            {from:itemManagerAddress, gasPrice: 1}
        );

        // Check if the new items were added.
        assert.equal(
            (await gameContract.length()).toNumber(),
            5,
            "The 5 new items were not created"
        );
    });

    it('Add Crafting Materials', async () => {
        // Tests registerCraftingMaterial()
        // Tests getGameContractId()

        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const crafting_manager_role = await craftingContract.CRAFTING_MANAGER_ROLE();
        
        await craftingContract.grantRole(crafting_manager_role, craftingManagerAddress, {from:deployerAddress, gasPrice: 1});
        
        var event = await craftingContract.registerCraftingMaterial(gameContract.address,1,{from:craftingManagerAddress, gasPrice: 1});
        
        // console.log("CraftItem: " + craftItemId.toString());
        // console.log("CraftItem: " + toBytes32(craftItemId));

        craftItemId = event.logs[0].args[0].toString();

        resultPair = await craftingContract.getGameContractId(
            craftItemId,
            {from:craftingManagerAddress, gasPrice: 1});
        
        assert.equal(
            resultPair[1],
            1,
            "Game Id is incorrect."
        );
        assert.equal(
            resultPair[0],
            gameContract.address,
            "Game Contract Address is incorrect."
        );
    });

    

    // it('Add Crafting Rewards', async () => {

    //     // Tests registerCraftingReward()
    // });

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