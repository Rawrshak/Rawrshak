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

        await gameContract.setGamePayableAddress(newOwnerAddress, {from:deployerAddress, gasPrice: 1});
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
        await gameContract.grantRole(minter_role, minterAddress, {from:deployerAddress, gasPrice: 1});
        
        // account 0 grants account 2 a role
        await gameContract.grantRole(burner_role, burnerAddress, {from:deployerAddress, gasPrice: 1});

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

    it('Create 3 Item', async () => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();

        const deployerAddress = accounts[0];
        const itemManagerAddress = accounts[4];

        // deployer address grants item manager address a the item manager role
        await gameContract.grantRole(item_manager_role, itemManagerAddress, {from:deployerAddress, gasPrice: 1});

        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Create 2 New Items
        // 0 is the solidity equivalent of address(0)
        await gameContract.createItem(1, '0x0000000000000000000000000000000000000000', {from:itemManagerAddress, gasPrice: 1});
        await gameContract.createItem(2, '0x0000000000000000000000000000000000000000', {from:itemManagerAddress, gasPrice: 1});
        await gameContract.createItem(3, '0x0000000000000000000000000000000000000000', {from:itemManagerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 3, "The 3 new items were not created.");
        assert.equal(await gameContract.exists(1), true, "Item 1 wasn't created.");
        assert.equal(await gameContract.exists(2), true, "Item 2 wasn't created.");
        assert.equal(await gameContract.exists(3), true, "Item 3 wasn't created.");
    });

    // Should I be able to delete an item? probably not.
    it('Delete 1 Item', async () => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();

        const itemManagerAddress = accounts[4];

        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Delete item with UUID 2
        await gameContract.removeItem(3, {from:itemManagerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 2, "There is only 2 item left.");
        assert.equal(await gameContract.exists(1), true, "Item 1 was deleted.");
        assert.equal(await gameContract.exists(2), true, "Item 2 was deleted.");
        assert.equal(await gameContract.exists(3), false, "Item 2 was not deleted.");
    });

    it('Community Created Item', async() => {
        const gameContract = await GameContract.deployed();
        const item_manager_role = await gameContract.ITEM_MANAGER_ROLE();
        const itemManagerAddress = accounts[4];
        const contentCreatorAddress = accounts[7];
        
        assert.equal(
            await gameContract.hasRole(
                item_manager_role,
                itemManagerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");
            
        // Create Item with Content Creator's address
        await gameContract.createItem(3, contentCreatorAddress, {from:itemManagerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 3, "The community content creator's new item was not created.");

        // check to see if address payable is the same
        const itemPayableAdderss = await gameContract.getCreatorAddress(3, {gasPrice: 1});
        assert.equal(itemPayableAdderss, contentCreatorAddress, "Community content creator's address was not set properly.");
    });

    it('Mint 10 Items of Item 1', async () => {
        const gameContract = await GameContract.deployed();
        const minter_role = await gameContract.MINTER_ROLE();
        const minterAddress = accounts[2];
        const playerAddress = accounts[5];
        const player2Address = accounts[6];

        // check to see if minter address is the minter role
        assert.equal(
            await gameContract.hasRole(
                minter_role,
                minterAddress),
            true, "Minter Address didn't have the Minter Role");

        // mint 10 items
        await gameContract.mint(playerAddress, 1, 10, {from:minterAddress, gasPrice: 1});

        // check if the item was minted
        assert.equal(
            (await gameContract.balanceOf(
                playerAddress,
                1)).toNumber(),
            10, "10 supply of Item 1 was not minted properly.");

        assert.equal(
            (await gameContract.getTotalSupply(1)).toNumber(),
            10, "10 supply of Item 1 was not minted properly.");
        
        // mint 10 items of item id 1 and 2
        await gameContract.mintBatch(player2Address, [1,2], [10,10], {from:minterAddress, gasPrice: 1});
        assert.equal(
            (await gameContract.balanceOf(
                player2Address,
                1)).toNumber(),
            10, "10 supply of Item 1 was not minted properly.");
        assert.equal(
            (await gameContract.balanceOf(
                player2Address,
                2)).toNumber(),
            10, "10 supply of Item 2 was not minted properly.");

        assert.equal(
            (await gameContract.getTotalSupply(1)).toNumber(),
            20, "The total supply of Item 1 is not correct.");
    });

    it('Burn 10 Items of Item 1', async () => {
        const gameContract = await GameContract.deployed();
        const burner_role = await gameContract.BURNER_ROLE();
        const burnerAddress = accounts[3];
        const playerAddress = accounts[5];
        const player2Address = accounts[6];

        // check to see if burner address is the burner role
        assert.equal(
            await gameContract.hasRole(
                burner_role,
                burnerAddress),
            true, "Burner Address didn't have the Burner Role");

        // burn 10 items
        await gameContract.burn(playerAddress, 1, 10, {from:burnerAddress, gasPrice: 1});

        // check if the item was burned
        assert.equal(
            (await gameContract.balanceOf(
                playerAddress,
                1)).toNumber(),
            0, "10 supply of Item 1 was not burned properly.");

        assert.equal(
            (await gameContract.getTotalSupply(1)).toNumber(),
            10, "10 supply of Item 1 was not burned properly.");
        
        // burn 10 items of item id 1 and 2
        await gameContract.burnBatch(player2Address, [1,2], [10,10], {from:burnerAddress, gasPrice: 1});
        assert.equal(
            (await gameContract.balanceOf(
                player2Address,
                1)).toNumber(),
            0, "20 supply of Item 1 was not burned properly.");
        assert.equal(
            (await gameContract.balanceOf(
                player2Address,
                2)).toNumber(),
            0, "10 supply of Item 2 was not burned properly.");

        assert.equal(
            (await gameContract.getTotalSupply(1)).toNumber(),
            0, "The total supply of Item 1 is not correct.");
    });
});