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

        bidPlacedEvent = await exchange.placeBid(player2Address, ovcToken.address, uuid0, 1, 100);
        data = await exchange.getDataEntry(bidPlacedEvent.logs[0].args[0]);
        assert.equal(data[0], player2Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid0.toString(), "item uuid is incorrect.");
        assert.equal(data[3].toNumber(), 1, "item amount is incorrect.");
        assert.equal(data[4].toNumber(), 100, "item price is incorrect.");
        assert.equal(data[5], true, "data entry is not a bid");
        assert.equal(await ovcToken.balanceOf(player2Address), 4900, "Player 2 balance was not deducted");

        bidPlacedEvent = await exchange.placeBid(player1Address, ovcToken.address, uuid2, 2, 100);
        data = await exchange.getDataEntry(bidPlacedEvent.logs[0].args[0]);
        assert.equal(data[0], player1Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(data[3].toNumber(), 2, "item amount is incorrect.");
        assert.equal(data[4].toNumber(), 100, "item price is incorrect.");
        assert.equal(data[5], true, "data entry is not a bid");
        assert.equal(await ovcToken.balanceOf(player1Address), 4800, "Player 2 balance was not deducted");

        
    });

    it('Place Asks', async () => {
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

        askPlacedEvent = await exchange.placeAsk(player2Address, ovcToken.address, uuid2, 1, 200);
        data = await exchange.getDataEntry(askPlacedEvent.logs[0].args[0]);
        assert.equal(data[0], player2Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(data[3].toNumber(), 1, "item amount is incorrect.");
        assert.equal(data[4].toNumber(), 200, "item price is incorrect.");
        assert.equal(data[5], false, "data entry is not an ask");
        assert.equal(await game.balanceOf(player2Address, inputItem2), 4, "Player 2 item balance was not deducted");
    });

    it('Get Exchange Data', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // Get Player 2 Orders
        p2orders = await exchange.getUserOrders(player2Address);
        assert.equal(p2orders.length, 2, "Not all P2 orders were counted.");

        p1orders = await exchange.getUserOrders(player1Address);
        assert.equal(p1orders.length, 1, "Not all P1 orders were counted.");

        // Check P1 Order data
        uuid2 = await registry.getUUID(game.address, inputItem2);
        data = await exchange.getDataEntry(p1orders[0]);
        assert.equal(data[0], player1Address, "user address is incorrect.");
        assert.equal(data[1], ovcToken.address, "token address is incorrect.");
        assert.equal(data[2].toString(), uuid2.toString(), "item uuid is incorrect.");
        assert.equal(data[5], true, "data entry is not a bid");

        // Check bids and asks on a specific item
        itemData = await exchange.getItemData(uuid2);
        assert.equal(itemData[0].length, 1, "There is 1 bid on item 2");
        assert.equal(itemData[1].length, 1, "There is 1 ask on item 2");

        // Check that the bid belongs to player 1
        data = await exchange.getDataEntry(itemData[0][0]);
        assert.equal(data[0], player1Address, "Bid doesn't belong to player 1.");
        
        // Check that the ask belongs to player 2
        data = await exchange.getDataEntry(itemData[1][0]);
        assert.equal(data[0], player2Address, "Ask doesn't belong to player 2.");
    });

    it('Fullfill Orders', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();

        // Check bids and asks on a specific item
        itemData = await exchange.getItemData(uuid2);
        assert.equal(itemData[0].length, 1, "There is 1 bid on item 2");
        assert.equal(itemData[1].length, 1, "There is 1 ask on item 2");

        // Player 2 fills Player 1's bid for item 2
        bidDataId = itemData[0][0];
        await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1}); 
        await exchange.fullfillOrder(bidDataId, {from: player2Address});
        assert.equal(await ovcToken.balanceOf(player2Address), 5100, "Player 2 tokens did not increase correctly.");
        assert.equal(await game.balanceOf(player2Address, inputItem2), 2, "Player 2 item inventory did not decrease correctly.");

        // Player 1 fills Player 2's ask for item 2
        askDataId = itemData[1][0];
        await ovcToken.approve(exchange.address, maxAllowance, {from: player1Address, gasPrice: 1}); 
        await exchange.fullfillOrder(askDataId, {from: player1Address});
        assert.equal(await ovcToken.balanceOf(player1Address), 4600, "Player 1 tokens did not decrease correctly.");
        assert.equal(await game.balanceOf(player1Address, inputItem2), 1, "Player 1 item inventory did not increase correctly.");
    });

    it('Claim succeeded orders', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();

        dataIds = await exchange.getClaimable(player1Address, {from: player1Address, gasPrice: 1});
        assert.equal(dataIds.length, 1, "There should only be 1 claimable from player 1.");

        // check player 1's existing number of items
        assert.equal(await game.balanceOf(player1Address, inputItem2), 1, "Player 1 should have 1 item 2.");

        // Claim player 1 items
        await exchange.claim(dataIds[0], {from: player1Address, gasPrice:1});

        // check if player 1 recieved the item
        assert.equal(await game.balanceOf(player1Address, inputItem2), 3, "Player 1 should now has 3 item2s.");

        // check data entry was deleted
        data = await exchange.getDataEntry(dataIds[0]);
        assert.equal(data[0], zero_address, "Order Entry was deleted.");

        // There shouldn't be anymore things to claim
        dataIds = await exchange.getClaimable(player1Address, {from: player1Address, gasPrice: 1});
        assert.equal(dataIds.length, 0, "Player 1 should have already claimed their items from escrow.");
        
        // Claim player 2 items
        dataIds = await exchange.getClaimable(player2Address, {from: player2Address, gasPrice: 1});
        assert.equal(dataIds.length, 1, "There should only be 1 claimable from player 2.");
        
        // check player 2's existing number of tokens
        assert.equal(await ovcToken.balanceOf(player2Address), 5100, "Player 2 should have 5100 tokens.");

        // Claim player 2 items
        await exchange.claim(dataIds[0], {from: player2Address, gasPrice:1});

        // check if player 2 recieved the item
        assert.equal(await ovcToken.balanceOf(player2Address), 5300, "Player 2 should now have 5300 tokens.");

        // check data entry was deleted
        data = await exchange.getDataEntry(dataIds[0]);
        assert.equal(data[0], zero_address, "Order Entry was deleted.");

        // There shouldn't be anymore things to claim
        dataIds = await exchange.getClaimable(player2Address, {from: player2Address, gasPrice: 1});
        assert.equal(dataIds.length, 0, "Player 2 should have already claimed their items from escrow.");
    });

    it('Delete Order', async () => {
        const game = await Game.deployed();
        const exchange = await Exchange.deployed();
        const ovcToken = await OvcTokenContract.deployed();

        orders = await exchange.getUserOrders(player2Address);
        assert.equal(orders.length, 1, "Not all P2 orders were counted.");

        // Delete item
        await exchange.deleteDataEntry(orders[0], {from: player2Address, gasPrice: 1});

        // check data entry was deleted
        data = await exchange.getDataEntry(orders[0]);
        assert.equal(data[0], zero_address, "Order Entry was not deleted.");

        // check if player 2 recieved the item
        assert.equal(await ovcToken.balanceOf(player2Address), 5400, "Player 2 should now have 5400 tokens.");
        
        orders = await exchange.getUserOrders(player2Address);
        assert.equal(orders.length, 0, "There should be 0 orders left.");
    });
});
