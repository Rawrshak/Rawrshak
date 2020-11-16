const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");
const CraftingContract = artifacts.require("CraftingContract");

contract('Game Contract', (accounts) => {
    it('Check Crafting Contract Roles', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();

        assert.equal(
            await craftingContract.hasRole(
                default_admin_role,
                accounts[0]),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await craftingContract.hasRole(
                crafting_manager_role,
                accounts[0]),
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
            "Contract.");

        assert.equal(
            await gameContract.hasRole(
                burner_role,
                craftingContract.address),
            true,
            "Crafting Contract does not have the burner role on Game " +
            "Contract.");
    });

    it('Add Crafting Materials', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests registerCraftingMaterial()
    });

    it('Add Crafting Rewards', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests registerCraftingReward()
    });

    it('Add Recipes', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests createRecipe()
    });

    it('Update Recipes', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests setRecipeActive()
        // Tests setRecipeActiveBatch()
        // Tests isRecipeActive()
        // Tests updateRecipeCost()
        // Tests updateRecipeCostBatch()
        // Tests getRecipeCost()
    });

    it('Get Crafting Materials for Recipe', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests getRewardsList(recipeId)
    });

    it('Get Crafting Rewards for Recipe', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests getRewardsList(recipeId)
    });

    it('Get List of Recipes that use specific crafting material', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();
        
        // Tests getItemAsCraftingMaterialList(contract, itemId);
        // Tests getItemAsCraftingMaterialList(craftId)
    });

    it('Get List of Recipes that reward specific crafting item', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests getItemAsRewardList(contract, itemId);
        // Tests getItemAsRewardList(craftId)
    });

    it('Get All Active Recipes', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // Tests getActiveRecipes();
        // Tests getActiveRecipesCount();
    });

    it('Craft an Item', async () => {
        const gameContract = await GameContract.deployed();
        const craftingContract = await CraftingContract.deployed();
        const default_admin_role = await craftingContract.DEFAULT_ADMIN_ROLE();
        const crafting_manager_role = 
            await craftingContract.CRAFTING_MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();
    });
});