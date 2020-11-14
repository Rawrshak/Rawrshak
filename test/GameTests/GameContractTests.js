const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");

contract('Game Contract', (accounts) => {
    it('Check Default Admin Role', async () => {
        const gameContract = await GameContract.deployed();
        const default_admin_role = await gameContract.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await gameContract.hasRole(
                default_admin_role,
                accounts[0]),
            true, "Deployer address is not the default admin role");
    });

    it('Check Game Payable Address', async () => {
        const gameContract = await GameContract.deployed();
        const gameOwnerAddress = await gameContract.getGamePayableAddress();

        assert.equal(gameOwnerAddress, accounts[0], "Deployer address is not the owner of the contract.");
    });

    it('Set Game Payable Address', async () => {
        const gameContract = await GameContract.deployed();
        const deployerAddress = accounts[0];
        const newOwnerAddress = accounts[1];

        await gameContract.setGamePayableAddress(newOwnerAddress, {from:deployerAddress});
        const gameOwnerAddress = await gameContract.getGamePayableAddress();

        assert.equal(gameOwnerAddress, newOwnerAddress, "Game Owner Address was not updated.");
    });

    it('Set Minter and Burner Roles', async () => {
        const gameContract = await GameContract.deployed();
        const default_admin_role = await gameContract.DEFAULT_ADMIN_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();
        const deployerAddress = accounts[0];
        const minterAddress = accounts[2];
        const burnerAddress = accounts[3];

        // check to see if first account is the admin role
        assert.equal(
            await gameContract.hasRole(
                default_admin_role,
                deployerAddress),
            true, "first account didn't have admin role");

        // account 0 grants account 1 a role
        await gameContract.grantRole(minter_role, minterAddress, {from:deployerAddress});
        
        // account 0 grants account 2 a role
        await gameContract.grantRole(burner_role, burnerAddress, {from:deployerAddress});

        // check to see if account 1 is the minter role
        assert.equal(
            await gameContract.hasRole(
                minter_role,
                minterAddress),
            true, "account 1 didn't have the minter role");

        // check to see if account 1 is the burner role
        assert.equal(
            await gameContract.hasRole(
                burner_role,
                burnerAddress),
            true, "account 2 didn't have the burner role");
    });

    it('Create 2 Item', async () => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();

        const deployerAddress = accounts[0];
        const itemManagerAddress = accounts[4];

        // deployer address grants item manager address a the item manager role
        await gameContract.grantRole(item_manager_role, itemManagerAddress, {from:deployerAddress});

        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Create 2 New Items
        await gameContract.createItem(1, {from:itemManagerAddress});
        await gameContract.createItem(2, {from:itemManagerAddress});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 2, "The 2 new items were not created.");
        assert.equal(await gameContract.exists(1), true, "Item 1 wasn't created.");
        assert.equal(await gameContract.exists(2), true, "Item 2 wasn't created.");
    });

    // Should I be able to delete an item? probably not.
    it('Delete 1 Item', async () => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();

        const itemManagerAddress = accounts[4];

        // check to see if account 1 is the minter role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Delete item with UUID 2
        await gameContract.removeItem(2, {from:itemManagerAddress});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 1, "There is only 1 item left.");
        assert.equal(await gameContract.exists(1), true, "Item 1 was deleted.");
        assert.equal(await gameContract.exists(2), false, "Item 2 was not deleted.");
    });
});