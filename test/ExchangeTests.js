const _deploy_contracts = require("../migrations/2_deploy_contracts");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const ManagerFactory = artifacts.require("ManagerFactory");
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
    var ovcToken, gameManager, game, exchange, itemRegistry;
    var minter_role, burner_role;
    var player1Orders = new Array(), player2Orders = new Array();

    it('Setup', async () => {
        itemRegistry = await GlobalItemRegistry.deployed();
        exchange = await Exchange.deployed();
        
        // Setup Game Factory
        gameFactory = await GameFactory.deployed();
        await gameFactory.setGlobalItemRegistryAddr(itemRegistry.address);
        
        // Setup Manager Factory
        managerFactory = await ManagerFactory.deployed();

        // Generate Game Manager
        gameManagerCreatedEvent = await managerFactory.createGameManagerContract();
        gameManagerAddress = gameManagerCreatedEvent.logs[0].args[1];
        gameManager = await GameManager.at(gameManagerAddress);
        gameCreatedEvents = await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");
        gameAddress = gameCreatedEvents.logs[2].args[1];
        game = await Game.at(gameAddress);

        // set token
        ovcToken = await OvcTokenContract.deployed();
    });
    
    it('Setup Tokens', async () => {
        // Test deployer token supply
        balance = await ovcToken.balanceOf(deployerAddress);
        assert.equal(balance.valueOf(), 1000000000, "1000000000 wasn't in the first account");

        // Give some token supply to the players
        await ovcToken.transfer(player1Address, 5000, {from:deployerAddress});
        await ovcToken.transfer(player2Address, 5000, {from:deployerAddress});
        assert.equal(await ovcToken.balanceOf(player1Address), 5000, "Player 1 was not sent 5000 OVC Tokens.");
        assert.equal(await ovcToken.balanceOf(player2Address), 5000, "Player 2 was not sent 5000 OVC Tokens.");
    });

    it('Setup Game', async () => {
        // Grant roles
        minter_role = await gameManager.MINTER_ROLE();
        burner_role = await gameManager.BURNER_ROLE();
        await gameManager.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await gameManager.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});

        // Create items
        itemIds= [inputItem0, inputItem1, inputItem2];
        maxSupplies = [0, 0, 0];
        await gameManager.createItemBatch(deployerAddress, itemIds, maxSupplies, {from:deployerAddress});
        assert.equal(await game.length(), 3, "The 3 new items were not created.");
        
        // Mint the items and send to the player 1 address
        items = [inputItem0, inputItem1];
        amounts = [5, 5];
        await gameManager.mintBatch(player1Address, items, amounts, {from: gcManagerAddress});
        assert.equal(await game.balanceOf(player1Address, inputItem0), 5, "Incorrect number of item 0.");
        assert.equal(await game.balanceOf(player1Address, inputItem1), 5, "Incorrect number of item 1.");

        // Mint the items and send to the player 1 address
        await gameManager.mint(player2Address, inputItem2, 5, {from: gcManagerAddress});
        assert.equal(await game.balanceOf(player2Address, inputItem2), 5, "Incorrect number of item 2.");
    });

    it('Place Bids', async () => {
        // Get UUIDs
        uuid0 = await itemRegistry.getUUID(game.address, inputItem0);
        uuid1 = await itemRegistry.getUUID(game.address, inputItem1);
        uuid2 = await itemRegistry.getUUID(game.address, inputItem2);
        
        assert.equal(await ovcToken.balanceOf(player1Address), 5000, "Player 1 does not have 5000 OVC Tokens.");
        assert.equal(await ovcToken.balanceOf(player2Address), 5000, "Player 2 does not have 5000 OVC Tokens.");

        await ovcToken.approve(exchange.address, maxAllowance, {from: player1Address, gasPrice: 1}); 
        await ovcToken.approve(exchange.address, maxAllowance, {from: player2Address, gasPrice: 1}); 

        bidPlacedEvent = await exchange.placeBid(player2Address, ovcToken.address, uuid0, 1, 100);
        assert.equal(bidPlacedEvent.logs[0].args[0], player2Address, "user address is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[1], ovcToken.address, "token address is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[2].toString(), uuid0.toString(), "item uuid is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[3].toNumber(), 1, "item amount is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[4].toNumber(), 100, "item price is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[5], true, "data entry is not a bid");
        player2Orders.push(bidPlacedEvent.logs[0].args[6]);
        assert.equal(await ovcToken.balanceOf(player2Address), 4900, "Player 2 balance was not deducted");

        bidPlacedEvent = await exchange.placeBid(player1Address, ovcToken.address, uuid2, 2, 100);
        assert.equal(bidPlacedEvent.logs[0].args[0], player1Address, "user address is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[1], ovcToken.address, "token address is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[3].toNumber(), 2, "item amount is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[4].toNumber(), 100, "item price is incorrect.");
        assert.equal(bidPlacedEvent.logs[0].args[5], true, "data entry is not a bid");
        player1Orders.push(bidPlacedEvent.logs[0].args[6]);
        assert.equal(await ovcToken.balanceOf(player1Address), 4800, "Player 2 balance was not deducted");
    });

    it('Place Asks', async () => {
        // Get UUIDs
        uuid0 = await itemRegistry.getUUID(game.address, inputItem0);
        uuid1 = await itemRegistry.getUUID(game.address, inputItem1);
        uuid2 = await itemRegistry.getUUID(game.address, inputItem2);
        
        assert.equal(await game.balanceOf(player1Address, inputItem0), 5, "Player 1 does not have 5 of item 0.");
        assert.equal(await game.balanceOf(player1Address, inputItem1), 5, "Player 1 does not have 5 of item 1.");
        assert.equal(await game.balanceOf(player2Address, inputItem2), 5, "Player 2 does not have 5 of item 2.");

        await game.setApprovalForAll(exchange.address, true, {from: player1Address, gasPrice: 1}); 
        await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1}); 

        askPlacedEvent = await exchange.placeAsk(player2Address, ovcToken.address, uuid2, 1, 200);
        assert.equal(askPlacedEvent.logs[0].args[0], player2Address, "user address is incorrect.");
        assert.equal(askPlacedEvent.logs[0].args[1], ovcToken.address, "token address is incorrect.");
        assert.equal(askPlacedEvent.logs[0].args[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(askPlacedEvent.logs[0].args[3].toNumber(), 1, "item amount is incorrect.");
        assert.equal(askPlacedEvent.logs[0].args[4].toNumber(), 200, "item price is incorrect.");
        assert.equal(askPlacedEvent.logs[0].args[5], false, "data entry is not an ask");
        player2Orders.push(askPlacedEvent.logs[0].args[6]);
        assert.equal(await game.balanceOf(player2Address, inputItem2), 4, "Player 2 item balance was not deducted");
    });

    it('Get Exchange Data', async () => {
        assert.equal(player1Orders.length, 1, "Not all P1 orders were counted.");
        assert.equal(player2Orders.length, 2, "Not all P2 orders were counted.");

        // Check P1 Order data
        uuid2 = await itemRegistry.getUUID(game.address, inputItem2);
        data = await exchange.getOrder(player1Orders[0]);
        assert.equal(data[0], player1Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(data[5], true, "data entry is not a bid");

        // Check P2 Order data
        uuid0 = await itemRegistry.getUUID(game.address, inputItem0);
        data = await exchange.getOrder(player2Orders[0]);
        assert.equal(data[0], player2Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid0.toString(), "item uuid is incorrect.");
        assert.equal(data[5], true, "data entry is not a bid");
        
        data = await exchange.getOrder(player2Orders[1]);
        assert.equal(data[0], player2Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(data[5], false, "data entry is not an ask");
    });

    it('Fullfill Orders', async () => {
        // Player 2 fills Player 1's bid for item 2
        bidDataId = player1Orders[0];
        await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1}); 
        await exchange.fullfillOrder(bidDataId, {from: player2Address});
        assert.equal(await ovcToken.balanceOf(player2Address), 5100, "Player 2 tokens did not increase correctly.");
        assert.equal(await game.balanceOf(player2Address, inputItem2), 2, "Player 2 item inventory did not decrease correctly.");

        // Player 1 fills Player 2's ask for item 2
        askDataId = player2Orders[1];
        await ovcToken.approve(exchange.address, maxAllowance, {from: player1Address, gasPrice: 1}); 
        await exchange.fullfillOrder(askDataId, {from: player1Address});
        assert.equal(await ovcToken.balanceOf(player1Address), 4600, "Player 1 tokens did not decrease correctly.");
        assert.equal(await game.balanceOf(player1Address, inputItem2), 1, "Player 1 item inventory did not increase correctly.");
    });

    it('Claim succeeded orders', async () => {
        // Claim player 1 items
        // check player 1's existing number of items
        assert.equal(await game.balanceOf(player1Address, inputItem2), 1, "Player 1 should have 1 item 2.");

        // Claim player 1 items
        await exchange.claim(player1Orders[0], {from: player1Address, gasPrice:1});

        // check if player 1 recieved the item
        assert.equal(await game.balanceOf(player1Address, inputItem2), 3, "Player 1 should now has 3 item2s.");

        // check data entry was deleted
        data = await exchange.getOrder(player1Orders[0]);
        assert.equal(data[0], zero_address, "Order Entry was deleted.");
        
        // Claim player 2 items        
        // check player 2's existing number of tokens
        assert.equal(await ovcToken.balanceOf(player2Address), 5100, "Player 2 should have 5100 tokens.");

        // Claim player 2 items
        await exchange.claim(player2Orders[1], {from: player2Address, gasPrice:1});

        // check if player 2 recieved the item
        assert.equal(await ovcToken.balanceOf(player2Address), 5300, "Player 2 should now have 5300 tokens.");

        // check data entry was deleted
        data = await exchange.getOrder(player2Orders[1]);
        assert.equal(data[0], zero_address, "Order Entry was deleted.");
    });

    it('Delete Order', async () => {
        // Delete item
        await exchange.deleteOrder(player2Orders[0], {from: player2Address, gasPrice: 1});

        // check data entry was deleted
        data = await exchange.getOrder(player2Orders[0]);
        assert.equal(data[0], zero_address, "Order Entry was not deleted.");

        // check if player 2 recieved the item
        assert.equal(await ovcToken.balanceOf(player2Address), 5400, "Player 2 should now have 5400 tokens.");
    });
});
