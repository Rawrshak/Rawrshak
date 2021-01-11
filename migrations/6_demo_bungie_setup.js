const ManagerFactory = artifacts.require("ManagerFactory");
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

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

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

    /*****************************************/
    /*****    Destiny 2 Game Data        *****/
    /*****************************************/

    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: bungieAddress});
    destiny2ManagerAddr = await managerFactory.gameManagerAddresses(bungieAddress, 1, {from: bungieAddress});
    destiny2Manager = await GameManager.at(destiny2ManagerAddr, {from: bungieAddress});

    // Create Game Contract
    await destiny2Manager.generateGameContract(gameFactory.address, "http://localhost:4000/games/5/items?id={id}", {from: bungieAddress});

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
};
