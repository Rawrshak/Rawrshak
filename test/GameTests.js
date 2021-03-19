const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const ManagerFactory = artifacts.require("ManagerFactory");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

contract('Game Contract', (accounts) => {
    const [
        deployerAddress,    // Address that deployed contracts
        newOwnerAddress,    // new developer wallet address
        minterAddress,      // address with minter capabilities
        burnerAddress,      // address with burner capabilities
        player1Address,     // Player 1 wallet address
        player2Address,     // Player 2 wallet address
        contentCreatorAddress // Content Creator Address
    ] = accounts;
    const [material1, material2, material3] = [0,1,2];
    var gameManager, gameManagerId, managerFactory;
    var itemRegistry, gameFactory;
    var gameId, gameAddress, game;
    var default_admin_role, minter_role, burner_role;

    it('Setup', async () => {
        itemRegistry = await GlobalItemRegistry.deployed();

        // Setup Game Factory
        gameFactory = await GameFactory.deployed();
        await gameFactory.setGlobalItemRegistryAddr(itemRegistry.address);
        
        // Setup Manager Factory
        managerFactory = await ManagerFactory.deployed();

        // Generate Game Manager
        gameManagerCreatedEvent = await managerFactory.createGameManagerContract();
        gameManagerId = gameManagerCreatedEvent.logs[0].args[0];
        gameManagerAddress = gameManagerCreatedEvent.logs[0].args[1];
        owner = gameManagerCreatedEvent.logs[0].args[2];
        assert.notEqual(gameManagerId, 0, "Incorrect Manager Contract Id"); // asserts only when gameManagerId is equal to 0
        //assert.equal(0, 0, ""); // expects that 0 is equal to 0. If true, will not assert.
        //assert.equal(1, 0, ""); // WILL assert because 1 doesn't equal 0
        //assert.notEqual(0, 0, ""); // expects that 0 is not equal to 0. WILL assert because 0 is equal to 0
        //assert.notEqual(1, 0, ""); // will NOT assert because 1 is not equal to 0
        assert.equal(owner, deployerAddress, "Incorrect owner");

        // Create Game Contract
        gameManager = await GameManager.at(gameManagerAddress);
        gameCreatedEvents = await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");

        gameId = gameCreatedEvents.logs[2].args[0];
        gameAddress = gameCreatedEvents.logs[2].args[1];
        owner = gameCreatedEvents.logs[2].args[2];
        assert.notEqual(gameId, 0, "Incorrect Game Contract Id");
        assert.equal(owner, gameManagerAddress, "Incorrect owner");
        game = await Game.at(gameAddress);
    });

    it('Check Game Payable Address', async () => {
        assert.equal(await gameManager.owner(), deployerAddress, "Deployer address is not the owner of the contract.");
    });

    it('Set Game Payable Address', async () => {
        await gameManager.transferOwnership(newOwnerAddress, {from:deployerAddress, gasPrice: 1});
        assert.equal(await gameManager.owner(), newOwnerAddress, "Game Owner Address was not updated.");

        // Transfer it back
        await gameManager.transferOwnership(deployerAddress, {from:newOwnerAddress, gasPrice: 1});
        assert.equal(await gameManager.owner(), deployerAddress, "Game Owner Address was not updated.");
    });
    
    it('Check Default Admin Role and set roles', async () => {
        default_admin_role = await gameManager.DEFAULT_ADMIN_ROLE();
        minter_role = await gameManager.MINTER_ROLE();
        burner_role = await gameManager.BURNER_ROLE();

        // check to see if first account is the admin role
        assert.equal(
            await gameManager.hasRole(
                default_admin_role,
                deployerAddress),
            true, "Deployer address is not the default admin role");
    });

    it('Set Minter and Burner Roles', async () => {
        // adeployer address grants minter address a role
        await gameManager.grantRole(minter_role, minterAddress, {from:deployerAddress, gasPrice: 1});
        
        // adeployer address grants burner address a role
        await gameManager.grantRole(burner_role, burnerAddress, {from:deployerAddress, gasPrice: 1});

        // check to see if minter address is the minter role
        assert.equal(
            await gameManager.hasRole(
                minter_role,
                minterAddress),
            true, "minter address didn't have the minter role");

        // check to see if burner address is the burner role
        assert.equal(
            await gameManager.hasRole(
                burner_role,
                burnerAddress),
            true, "burner address didn't have the burner role");
    });

    it('Create 2 Items', async () => {
        // Create 2 New Items
        // 0 is the solidity equivalent of address(0)        
        await gameManager.createItem(deployerAddress, material1, 0, {from:deployerAddress, gasPrice: 1});
        await gameManager.createItem(deployerAddress, material2, 0, {from:deployerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 2, "The 2 new items were not created.");
        assert.equal(await game.contains(material1), true, "Material 1 wasn't created.");
        assert.equal(await game.contains(material2), true, "Material 2 wasn't created.");
    });

    it('Community Created Item', async() => {            
        // Create Item with Content Creator's address        
        await gameManager.createItem(contentCreatorAddress, material3, 0, {from:deployerAddress, gasPrice: 1});

        // Check if the new items were added.
        assert.equal((await game.length()).toNumber(), 3, "The community content creator's new item was not created.");

        // check to see if address payable is the same
        result = await game.getItemInfo(material3, {gasPrice: 1});
        assert.equal(result[0], contentCreatorAddress, "Community content creator's address was not set properly.");
        assert.equal(result[1], 0, "Community content creator's item supply is not set properly.");
    });

    it('Mint 10 Items of Item 1', async () => {
        // mint 10 items
        await gameManager.mint(player1Address, material1, 10, {from:minterAddress, gasPrice: 1});

        // check if the item was minted
        assert.equal(
            (await game.balanceOf(player1Address, material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );

        assert.equal(
            (await game.currentSupply(material1)).toNumber(),
            10,
            "10 supply of Material 1 was not minted properly."
        );
        
        // mint 10 items of item id 1 and 2
        await gameManager.mintBatch(player2Address, [material1,material2], [10,10], {from:minterAddress, gasPrice: 1});
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
            (await game.currentSupply(material1)).toNumber(),
            20,
            "The current supply of Material 1 is not correct."
        );
    });

    it('Burn 10 Items of Item 1', async () => {
        // burn 10 items
        await gameManager.burn(player1Address, material1, 10, {from:burnerAddress, gasPrice: 1});

        // check if the item was burned
        assert.equal(
            (await game.balanceOf(player1Address,material1)).toNumber(),
            0,
            "10 supply of Item 1 was not burned properly."
        );

        assert.equal(
            (await game.currentSupply(material1)).toNumber(),
            10,
            "10 supply of Item 1 was not burned properly."
        );
        
        // burn 10 items of item id 1 and 2
        await gameManager.burnBatch(player2Address, [material1,material2], [10,10], {from:burnerAddress, gasPrice: 1});
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
            (await game.currentSupply(material1)).toNumber(),
            0,
            "The current supply of Item 1 is not correct."
        );
    });
});