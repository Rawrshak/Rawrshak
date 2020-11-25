const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");

contract('Game Contract', (accounts) => {
    const [
        deployerAddress,    // Address that deployed contracts
        newOwnerAddress,    // new developer wallet address
        minterAddress,      // address with minter capabilities
        burnerAddress,      // address with burner capabilities
        managerAddress,     // item manager address
        player1Address,     // Player 1 wallet address
        player2Address,     // Player 2 wallet address
        contentCreatorAddress // Content Creator Address
    ] = accounts;
    const [material1, material2, material3, reward1, reward2] = [0,1,2,3,4];
    const [recipe0, recipe1, recipe2] = [0,1,2];
    const zero_address = "0x0000000000000000000000000000000000000000";

    it('Check Default Admin Role', async () => {
        const game = await Game.deployed();
        const default_admin_role = await game.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await game.hasRole(
                default_admin_role,
                accounts[0]),
            true, "Deployer address is not the default admin role");
    });

    it('Check Game Payable Address', async () => {
        const game = await Game.deployed();
        const gameOwnerAddress = await game.getGamePayableAddress();

        assert.equal(gameOwnerAddress, accounts[0], "Deployer address is not the owner of the contract.");
    });

    it('Set Game Payable Address', async () => {
        const game = await Game.deployed();

        await game.setGamePayableAddress(newOwnerAddress, {from:deployerAddress, gasPrice: 1});
        const gameOwnerAddress = await game.getGamePayableAddress();

        assert.equal(gameOwnerAddress, newOwnerAddress, "Game Owner Address was not updated.");
    });

    it('Set Minter and Burner Roles', async () => {
        const game = await Game.deployed();
        const default_admin_role = await game.DEFAULT_ADMIN_ROLE();
        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        // check to see if first account is the admin role
        assert.equal(
            await game.hasRole(
                default_admin_role,
                deployerAddress),
            true, "first account didn't have admin role");

        // account 0 grants account 1 a role
        await game.grantRole(minter_role, minterAddress, {from:deployerAddress, gasPrice: 1});
        
        // account 0 grants account 2 a role
        await game.grantRole(burner_role, burnerAddress, {from:deployerAddress, gasPrice: 1});

        // check to see if account 1 is the minter role
        assert.equal(
            await game.hasRole(
                minter_role,
                minterAddress),
            true, "account 1 didn't have the minter role");

        // check to see if account 1 is the burner role
        assert.equal(
            await game.hasRole(
                burner_role,
                burnerAddress),
            true, "account 2 didn't have the burner role");
    });

    it('Create 3 Item', async () => {
        const game = await Game.deployed();
        const manager_role = await game.MANAGER_ROLE();

        // deployer address grants item manager address a the item manager role
        await game.grantRole(manager_role, managerAddress, {from:deployerAddress, gasPrice: 1});

        // check to see if item manager address has the item manger role
        assert.equal(
            await game.hasRole(
                manager_role,
                managerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Create 2 New Items
        // 0 is the solidity equivalent of address(0)        
        await game.createItem(zero_address, material1, 0, {from:managerAddress, gasPrice: 1});
        await game.createItem(managerAddress, material2, 0, {from:managerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 2, "The 2 new items were not created.");
        assert.equal(await game.contains(material1), true, "Material 1 wasn't created.");
        assert.equal(await game.contains(material2), true, "Material 2 wasn't created.");
    });

    // // Should I be able to delete an item? probably not.
    // it('Delete 1 Item', async () => {
    //     const game = await Game.deployed();
    //     const manager_role = await game.MANAGER_ROLE();

    //     // check to see if item manager address has the item manger role
    //     assert.equal(
    //         await game.hasRole(
    //             manager_role,
    //             managerAddress),
    //         true, "Item Manager Address didn't have the Item Manager Role");

    //     // Delete item with UUID 2
    //     await game.deleteItem(material3, {from:managerAddress, gasPrice: 1});

    //     // Check if the new items were added.
    //     assert.equal((await game.length()).toNumber(), 2, "There is only 2 item left.");
    //     assert.equal(await game.contains(material1), true, "Material 1 was deleted.");
    //     assert.equal(await game.contains(material2), true, "Material 2 was deleted.");
    //     assert.equal(await game.contains(material3), false, "Material 2 was not deleted.");
    // });

    it('Community Created Item', async() => {
        const game = await Game.deployed();
        const manager_role = await game.MANAGER_ROLE();
        
        assert.equal(
            await game.hasRole(
                manager_role,
                managerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");
            
        // Create Item with Content Creator's address        
        await game.createItem(contentCreatorAddress, material3, 0, {from:managerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 3, "The community content creator's new item was not created.");

        // check to see if address payable is the same
        const itemPayableAdderss = await game.getCreatorAddress(material3, {gasPrice: 1});
        assert.equal(itemPayableAdderss, contentCreatorAddress, "Community content creator's address was not set properly.");
    });

    it('Mint 10 Items of Item 1', async () => {
        const game = await Game.deployed();
        const minter_role = await game.MINTER_ROLE();

        // check to see if minter address is the minter role
        assert.equal(
            await game.hasRole(
                minter_role,
                minterAddress),
            true, "Minter Address didn't have the Minter Role");

        // mint 10 items
        await game.mint(player1Address, material1, 10, {from:minterAddress, gasPrice: 1});

        // check if the item was minted
        assert.equal(
            (await game.balanceOf(player1Address, material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );

        assert.equal(
            (await game.getTotalSupply(material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );
        
        // mint 10 items of item id 1 and 2
        await game.mintBatch(player2Address, [material1,material2], [10,10], {from:minterAddress, gasPrice: 1});
        assert.equal(
            (await game.balanceOf(player2Address, material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );

        assert.equal(
            (await game.balanceOf(player2Address, material2)).toNumber(),
            10,
            "10 supply of Material 2 was not minted properly."
        );

        assert.equal(
            (await game.getTotalSupply(material1)).toNumber(),
            20,
            "The total supply of Material 1 is not correct."
        );
    });

    it('Burn 10 Items of Item 1', async () => {
        const game = await Game.deployed();
        const burner_role = await game.BURNER_ROLE();

        // check to see if burner address is the burner role
        assert.equal(await game.hasRole(burner_role, burnerAddress),
            true,
            "Burner Address didn't have the Burner Role"
        );

        // burn 10 items
        await game.burn(player1Address, material1, 10, {from:burnerAddress, gasPrice: 1});

        // check if the item was burned
        assert.equal(
            (await game.balanceOf(player1Address,material1)).toNumber(),
            0,
            "10 supply of Item 1 was not burned properly."
        );

        assert.equal(
            (await game.getTotalSupply(material1)).toNumber(),
            10,
            "10 supply of Item 1 was not burned properly."
        );
        
        // burn 10 items of item id 1 and 2
        await game.burnBatch(player2Address, [material1,material2], [10,10], {from:burnerAddress, gasPrice: 1});
        assert.equal(
            (await game.balanceOf(player2Address, material1)).toNumber(),
            0,
            "20 supply of Item 1 was not burned properly."
        );

        assert.equal(
            (await game.balanceOf(player2Address, material2)).toNumber(),
            0,
            "10 supply of Item 2 was not burned properly."
        );

        assert.equal(
            (await game.getTotalSupply(material1)).toNumber(),
            0,
            "The total supply of Item 1 is not correct."
        );
    });
});