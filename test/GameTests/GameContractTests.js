const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");

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

        await gameContract.setGamePayableAddress(newOwnerAddress, {from:deployerAddress, gasPrice: 1});
        const gameOwnerAddress = await gameContract.getGamePayableAddress();

        assert.equal(gameOwnerAddress, newOwnerAddress, "Game Owner Address was not updated.");
    });

    it('Set Minter and Burner Roles', async () => {
        const gameContract = await GameContract.deployed();
        const default_admin_role = await gameContract.DEFAULT_ADMIN_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

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
        const manager_role = await gameContract.MANAGER_ROLE();

        // deployer address grants item manager address a the item manager role
        await gameContract.grantRole(manager_role, managerAddress, {from:deployerAddress, gasPrice: 1});

        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                manager_role,
                managerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Create 2 New Items
        // 0 is the solidity equivalent of address(0)
        await gameContract.methods['createItem(uint256)'](material1, {from:managerAddress, gasPrice: 1});
        await gameContract.methods['createItem(uint256,address)'](material2, managerAddress, {from:managerAddress, gasPrice: 1});
        await gameContract.methods['createItem(uint256,address,uint256)'](material3, managerAddress, 10, {from:managerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 3, "The 3 new items were not created.");
        assert.equal(await gameContract.exists(material1), true, "Material 1 wasn't created.");
        assert.equal(await gameContract.exists(material2), true, "Material 2 wasn't created.");
        assert.equal(await gameContract.exists(material3), true, "Material 3 wasn't created.");
    });

    // Should I be able to delete an item? probably not.
    it('Delete 1 Item', async () => {
        const gameContract = await GameContract.deployed();
        const manager_role = await gameContract.MANAGER_ROLE();

        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(
                manager_role,
                managerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");

        // Delete item with UUID 2
        await gameContract.deleteItem(material3, {from:managerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 2, "There is only 2 item left.");
        assert.equal(await gameContract.exists(material1), true, "Material 1 was deleted.");
        assert.equal(await gameContract.exists(material2), true, "Material 2 was deleted.");
        assert.equal(await gameContract.exists(material3), false, "Material 2 was not deleted.");
    });

    it('Community Created Item', async() => {
        const gameContract = await GameContract.deployed();
        const manager_role = await gameContract.MANAGER_ROLE();
        
        assert.equal(
            await gameContract.hasRole(
                manager_role,
                managerAddress),
            true, "Item Manager Address didn't have the Item Manager Role");
            
        // Create Item with Content Creator's address
        await gameContract.methods['createItem(uint256,address)'](material3, contentCreatorAddress, {from:managerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await gameContract.length()).toNumber(), 3, "The community content creator's new item was not created.");

        // check to see if address payable is the same
        const itemPayableAdderss = await gameContract.getCreatorAddress(material3, {gasPrice: 1});
        assert.equal(itemPayableAdderss, contentCreatorAddress, "Community content creator's address was not set properly.");
    });

    it('Mint 10 Items of Item 1', async () => {
        const gameContract = await GameContract.deployed();
        const minter_role = await gameContract.MINTER_ROLE();

        // check to see if minter address is the minter role
        assert.equal(
            await gameContract.hasRole(
                minter_role,
                minterAddress),
            true, "Minter Address didn't have the Minter Role");

        // mint 10 items
        await gameContract.mint(player1Address, material1, 10, {from:minterAddress, gasPrice: 1});

        // check if the item was minted
        assert.equal(
            (await gameContract.balanceOf(player1Address, material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );

        assert.equal(
            (await gameContract.getTotalSupply(material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );
        
        // mint 10 items of item id 1 and 2
        await gameContract.mintBatch(player2Address, [material1,material2], [10,10], {from:minterAddress, gasPrice: 1});
        assert.equal(
            (await gameContract.balanceOf(player2Address, material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );

        assert.equal(
            (await gameContract.balanceOf(player2Address, material2)).toNumber(),
            10,
            "10 supply of Material 2 was not minted properly."
        );

        assert.equal(
            (await gameContract.getTotalSupply(material1)).toNumber(),
            20,
            "The total supply of Material 1 is not correct."
        );
    });

    it('Burn 10 Items of Item 1', async () => {
        const gameContract = await GameContract.deployed();
        const burner_role = await gameContract.BURNER_ROLE();

        // check to see if burner address is the burner role
        assert.equal(await gameContract.hasRole(burner_role, burnerAddress),
            true,
            "Burner Address didn't have the Burner Role"
        );

        // burn 10 items
        await gameContract.burn(player1Address, material1, 10, {from:burnerAddress, gasPrice: 1});

        // check if the item was burned
        assert.equal(
            (await gameContract.balanceOf(player1Address,material1)).toNumber(),
            0,
            "10 supply of Item 1 was not burned properly."
        );

        assert.equal(
            (await gameContract.getTotalSupply(material1)).toNumber(),
            10,
            "10 supply of Item 1 was not burned properly."
        );
        
        // burn 10 items of item id 1 and 2
        await gameContract.burnBatch(player2Address, [material1,material2], [10,10], {from:burnerAddress, gasPrice: 1});
        assert.equal(
            (await gameContract.balanceOf(player2Address, material1)).toNumber(),
            0,
            "20 supply of Item 1 was not burned properly."
        );

        assert.equal(
            (await gameContract.balanceOf(player2Address, material2)).toNumber(),
            0,
            "10 supply of Item 2 was not burned properly."
        );

        assert.equal(
            (await gameContract.getTotalSupply(material1)).toNumber(),
            0,
            "The total supply of Item 1 is not correct."
        );
    });
});