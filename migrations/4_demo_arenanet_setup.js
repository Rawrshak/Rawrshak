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
    /*****      Guild Wars Game Data     *****/
    /*****************************************/

    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: arenaNetAddress});
    guildWarsManagerAddr = await managerFactory.gameManagerAddresses(arenaNetAddress, 0, {from: arenaNetAddress});
    guildWarsManager = await GameManager.at(guildWarsManagerAddr, {from: arenaNetAddress});

    // Create Game Contract
    await guildWarsManager.generateGameContract(gameFactory.address, "http://localhost:4000/games/1/items?id={id}", {from: arenaNetAddress});
    gameAddr = await guildWarsManager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    mintAmounts = [50,50,50,0,0,0,0,0,0,0,0,0,0,50,50];
    await guildWarsManager.createItemBatch(arenaNetAddress, itemIds, maxAmounts, {from:arenaNetAddress, gasPrice: 1});
    await guildWarsManager.mintBatch(arenaNetAddress, itemIds, mintAmounts, {from:arenaNetAddress, gasPrice: 1});
    
    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: arenaNetAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 0);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 1);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 2);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 13);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 14);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});

    /*****************************************/
    /*****    Guild Wars 2 Game Data     *****/
    /*****************************************/

    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: arenaNetAddress});
    guildWars2ManagerAddr = await managerFactory.gameManagerAddresses(arenaNetAddress, 1, {from: arenaNetAddress});
    guildWars2Manager = await GameManager.at(guildWars2ManagerAddr, {from: arenaNetAddress});

    // Create Game Contract
    await guildWars2Manager.generateGameContract(gameFactory.address, "http://localhost:4000/games/2/items?id={id}", {from: arenaNetAddress});
    gameAddr = await guildWars2Manager.gameAddr();
    game = await Game.at(gameAddr);


    // Create Items
    itemIds = [15,16,17,18,19,20,21,22,23,24];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0];
    await guildWars2Manager.createItemBatch(arenaNetAddress, itemIds, maxAmounts, {from:arenaNetAddress, gasPrice: 1});
    
    itemIds = [25,26,27,28,29,30,31,32,33,34,35,36];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0,0,0];
    await guildWars2Manager.createItemBatch(arenaNetAddress, itemIds, maxAmounts, {from:arenaNetAddress, gasPrice: 1});

    // Mint some items
    itemIds = [15,27,30,32,16];
    mintAmounts=[30,30,30,30,30];
    await guildWars2Manager.mintBatch(arenaNetAddress, itemIds, mintAmounts, {from:arenaNetAddress, gasPrice: 1});
    
    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: arenaNetAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 15);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1000', 'gwei'), {from:arenaNetAddress, gasPrice: 1});

    itemUUID = await registry.getUUID(game.address, 27);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1100', 'gwei'), {from:arenaNetAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 30);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1200', 'gwei'));
    
    itemUUID = await registry.getUUID(game.address, 32);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('1000', 'gwei'));
    
    itemUUID = await registry.getUUID(game.address, 16);
    await exchange.placeAsk(arenaNetAddress, ovcToken.address, itemUUID, 30, web3.utils.toWei('900', 'gwei'));
};
