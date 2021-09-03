const RawrshakTokenContract = artifacts.require("RawrToken");
const ManagerFactory = artifacts.require("ManagerFactory");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        electronicArtsAddress,            // Developer wallet address
        activisionAddress,            // Developer wallet address
        nintendoAddress,              // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address,             // Player 3 test address
        player4Address,             // Player 4 test address
        player5Address,             // Player 5 test address
        player6Address              // Player 6 test address
    ] = accounts;

    rawrToken = await RawrshakTokenContract.deployed();

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

    // Set up Exchange Contract
    exchange = await Exchange.deployed();
    await exchange.setGlobalItemRegistryAddr(registry.address);
    
    // Set Approvals
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player1Address, gasPrice: 1});
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player2Address, gasPrice: 1});
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player3Address, gasPrice: 1});
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player4Address, gasPrice: 1});
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player5Address, gasPrice: 1});
    await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player6Address, gasPrice: 1});

    // Set up Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    // Setup Manager Factory
    managerFactory = await ManagerFactory.deployed();

    /*****************************************/
    /*****    Call of Duty Game Data    *****/
    /*****************************************/

    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: activisionAddress});
    battlefield3ManagerAddr = await managerFactory.gameManagerAddresses(activisionAddress, 0, {from: activisionAddress});
    battlefield3Manager = await GameManager.at(battlefield3ManagerAddr, {from: activisionAddress});

    // Create Game Contract
    await battlefield3Manager.generateGameContract(gameFactory.address, "http://localhost:4000/", {from: activisionAddress});
    gameAddr = await battlefield3Manager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [10,11,12];
    maxAmounts = [0,0,0];
    mintAmounts = [10,10,10];
    await battlefield3Manager.createItemBatch(activisionAddress, itemIds, maxAmounts, {from:activisionAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(activisionAddress, itemIds, mintAmounts, {from:activisionAddress, gasPrice: 1});
    

    // Mint Default assets for players
    // Player 1 - gets all the characters
    itemIds = [10,11,12];
    mintAmounts = [1, 1, 1];
    await battlefield3Manager.mintBatch(player1Address, itemIds, mintAmounts, {from:activisionAddress, gasPrice: 1});
    
    // Player 4 - Gets Mutant character
    itemIds = [12]; 
    mintAmounts = [1];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:activisionAddress, gasPrice: 1});
    
    // Player 5 - Gets War Zombie
    itemIds = [10]; 
    mintAmounts = [1];
    await battlefield3Manager.mintBatch(player5Address, itemIds, mintAmounts, {from:activisionAddress, gasPrice: 1});

    // // Todo: Update this for Marketplace demo
    // // Approve developer address for sales
    // await game.setApprovalForAll(exchange.address, true, {from: activisionAddress, gasPrice: 1});

    // // Place Items on sale
    // itemUUID = await registry.getUUID(game.address, 8);
    // await exchange.placeAsk(activisionAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:activisionAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 9);
    // await exchange.placeAsk(activisionAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:activisionAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 10);
    // await exchange.placeAsk(activisionAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:activisionAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 11);
    // await exchange.placeAsk(activisionAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:activisionAddress, gasPrice: 1});

    // // Approve player for Sell Orders
    // await game.setApprovalForAll(exchange.address, true, {from: player4Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player5Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player6Address, gasPrice: 1});

    // // Place Player Buy/Sell orders
    // // Player 4
    // itemUUID = await registry.getUUID(game.address, 10);
    // await exchange.placeBid(player4Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('950', 'gwei'), {from:player4Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 9);
    // await exchange.placeAsk(player4Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player4Address, gasPrice: 1});
    
    // // Player 5
    // itemUUID = await registry.getUUID(game.address, 11);
    // await exchange.placeBid(player5Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('975', 'gwei'), {from:player5Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 10);
    // await exchange.placeAsk(player5Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player5Address, gasPrice: 1});
    
    // // Player 6 
    // itemUUID = await registry.getUUID(game.address, 12);
    // await exchange.placeBid(player6Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('980', 'gwei'), {from:player6Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 11);
    // await exchange.placeAsk(player6Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player6Address, gasPrice: 1});

};
