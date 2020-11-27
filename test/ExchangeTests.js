const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const Exchange = artifacts.require("Exchange");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const OvcTokenContract = artifacts.require("OVCToken");

contract('Exchange Contract', (accounts) => {
    // Constants
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        player1Address,           // Developer Address for managing the Lootbox Contract
        player2Address,              // Player Address
    ] = accounts;
    const [
        inputItem0,
        inputItem1,
        inputItem2
    ] = [0,1,2];
    const zero_address = "0x0000000000000000000000000000000000000000";
    const maxAllowance = "500";

    it('Setup', async () => {
        const game = await Game.deployed();
        const ovcToken = await OvcTokenContract.deployed();
        
        // Test deployer token supply
        const balance = await ovcToken.balanceOf(accounts[0]);
        assert.equal(balance.valueOf(), 1000000000, "1000000000 wasn't in the first account");

        // Grant roles
        const gc_manager_role = await game.MANAGER_ROLE();
        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();
        await game.grantRole(gc_manager_role, gcManagerAddress, {from:deployerAddress});
        await game.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await game.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});

        // Give some token supply to the players
        await ovcToken.transfer(player1Address, 5000, {from:deployerAddress});
        await ovcToken.transfer(player2Address, 5000, {from:deployerAddress});
        assert.equal(await ovcToken.balanceOf(player1Address), 5000, "Player 1 was not sent 5000 OVC Tokens.");
        assert.equal(await ovcToken.balanceOf(player2Address), 5000, "Player 2 was not sent 5000 OVC Tokens.");

        // Create items
        itemIds= [inputItem0, inputItem1, inputItem2];
        maxSupplies = [0, 0, 0];
        await game.createItemBatch(zero_address, itemIds, maxSupplies, {from:gcManagerAddress});
        assert.equal(await game.length(), 3, "The 3 new items were not created.");
        
        // Mint the items and send to the player 1 address
        items = [inputItem0, inputItem1];
        amounts = [5, 5];
        await game.mintBatch(player1Address, items, amounts, {from: gcManagerAddress});
        assert.equal(await game.balanceOf(player1Address, inputItem0), 5, "Incorrect number of item 0.");
        assert.equal(await game.balanceOf(player1Address, inputItem1), 5, "Incorrect number of item 1.");

        // Mint the items and send to the player 1 address
        await game.mint(player2Address, inputItem2, 5, {from: gcManagerAddress});
        assert.equal(await game.balanceOf(player2Address, inputItem2), 5, "Incorrect number of item 2.");
    });

    it('Place Bids', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // Get UUIDs
        uuid0 = await registry.getUUID(game.address, inputItem0);
        uuid1 = await registry.getUUID(game.address, inputItem1);
        uuid2 = await registry.getUUID(game.address, inputItem2);
        
        assert.equal(await ovcToken.balanceOf(player1Address), 5000, "Player 1 does not have 5000 OVC Tokens.");
        assert.equal(await ovcToken.balanceOf(player2Address), 5000, "Player 2 does not have 5000 OVC Tokens.");

        await ovcToken.approve(exchange.address, maxAllowance, {from: player1Address, gasPrice: 1}); 
        await ovcToken.approve(exchange.address, maxAllowance, {from: player2Address, gasPrice: 1}); 
        await exchange.placeBid(player2Address, ovcToken.address, uuid0, 1, 100);
        await exchange.placeBid(player1Address, ovcToken.address, uuid2, 2, 100);
    });

    it('Ask Bids', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // Get UUIDs
        uuid0 = await registry.getUUID(game.address, inputItem0);
        uuid1 = await registry.getUUID(game.address, inputItem1);
        uuid2 = await registry.getUUID(game.address, inputItem2);
        
        assert.equal(await game.balanceOf(player1Address, inputItem0), 5, "Player 1 does not have 5 of item 0.");
        assert.equal(await game.balanceOf(player1Address, inputItem1), 5, "Player 1 does not have 5 of item 1.");
        assert.equal(await game.balanceOf(player2Address, inputItem2), 5, "Player 2 does not have 5 of item 2.");

        await game.setApprovalForAll(exchange.address, true, {from: player1Address, gasPrice: 1}); 
        await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1}); 
        await exchange.placeAsk(player2Address, ovcToken.address, uuid2, 1, 200);
    });
});
