const OVCTokenContract = artifacts.require("OVCToken");
const ManagerFactory = artifacts.require("ManagerFactory");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        arenaNetAddress,            // Developer wallet address
        blizzardAddress,            // Developer wallet address
        bungieAddress,              // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address,             // Player 3 test address
        player4Address,             // Player 4 test address
        player5Address,             // Player 5 test address
        player6Address              // Player 6 test address
    ] = accounts;

    ovcToken = await OVCTokenContract.deployed();

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

    // Set up Exchange Contract
    exchange = await Exchange.deployed();
    await exchange.setGlobalItemRegistryAddr(registry.address);

    // Set up Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    // Setup Manager Factory
    managerFactory = await ManagerFactory.deployed();

    /*****************************************/
    /*****       Destiny Game Data       *****/
    /*****************************************/
    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: bungieAddress});
    destinyManagerAddr = await managerFactory.gameManagerAddresses(bungieAddress, 0, {from: bungieAddress});
    destinyManager = await GameManager.at(destinyManagerAddr, {from: bungieAddress});

    // Create Game Contract
    await destinyManager.generateGameContract(gameFactory.address, "http://localhost:4000/games/4/items?id={id}", {from: bungieAddress});
    gameAddr = await destinyManager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [60,61,62,63,64,65,66,67,68,69];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0];
    await destinyManager.createItemBatch(bungieAddress, itemIds, maxAmounts, {from:bungieAddress, gasPrice: 1});

    itemIds = [70,71,72,73,74,75,76];
    maxAmounts = [0,0,0,0,0,0,0];
    await destinyManager.createItemBatch(bungieAddress, itemIds, maxAmounts, {from:bungieAddress, gasPrice: 1});

    // Mint some items
    itemIds = [60,68,69,75,61,67,70,76];
    mintAmounts=[30,30,30,30,30,30,30,30];
    await destinyManager.mintBatch(bungieAddress, itemIds, mintAmounts, {from:bungieAddress, gasPrice: 1});

    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: bungieAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 60);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 68);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 69);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 75);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 61);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 67);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 70);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 76);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1500', 'gwei'), {from:bungieAddress, gasPrice: 1});
    
    /*****************************************/
    /*****    Destiny 2 Game Data        *****/
    /*****************************************/

    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: bungieAddress});
    destiny2ManagerAddr = await managerFactory.gameManagerAddresses(bungieAddress, 1, {from: bungieAddress});
    destiny2Manager = await GameManager.at(destiny2ManagerAddr, {from: bungieAddress});

    // Create Game Contract
    await destiny2Manager.generateGameContract(gameFactory.address, "http://localhost:4000/games/5/items?id={id}", {from: bungieAddress});
    gameAddr = await destiny2Manager.gameAddr();
    game = await Game.at(gameAddr);

    // Create Items
    itemIds = [77,78,79,80,81,82,83,84,85,86];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0];
    await destiny2Manager.createItemBatch(bungieAddress, itemIds, maxAmounts, {from:bungieAddress, gasPrice: 1});
    
    itemIds = [87,88,89,90,91,92,93,94,95,96,97];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0,0];
    await destiny2Manager.createItemBatch(bungieAddress, itemIds, maxAmounts, {from:bungieAddress, gasPrice: 1});

    // Mint some items
    itemIds = [77,90,93,94,95,97,78,89];
    mintAmounts=[45,45,45,45,45,45,45,45];
    await destiny2Manager.mintBatch(bungieAddress, itemIds, mintAmounts, {from:bungieAddress, gasPrice: 1});   
    
    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: bungieAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 77);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 90);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 93);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 94);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 95);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 97);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 78);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
    
    itemUUID = await registry.getUUID(game.address, 89);
    await exchange.placeAsk(bungieAddress, ovcToken.address, itemUUID, 45, web3.utils.toWei('2000', 'gwei'), {from:bungieAddress, gasPrice: 1}); 
};
