const RawrshakTokenContract = artifacts.require("RawrToken");
const ManagerFactory = artifacts.require("ManagerFactory");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer, networks, accounts) {
    // [
    //     deployerAddress,            // Address that deployed contracts
    //     arenaNetAddress,            // Developer wallet address
    //     blizzardAddress,            // Developer wallet address
    //     bungieAddress,              // Developer wallet address
    //     player1Address,             // Player 1 test address
    //     player2Address,             // Player 2 test address
    //     player3Address,             // Player 3 test address
    //     player4Address,             // Player 4 test address
    //     player5Address,             // Player 5 test address
    //     player6Address              // Player 6 test address
    // ] = accounts;

    // rawrToken = await RawrshakTokenContract.deployed();

    // // set up GlobalItemRegistry Contract
    // registry = await GlobalItemRegistry.deployed();

    // // Set up Exchange Contract
    // exchange = await Exchange.deployed();
    // await exchange.setGlobalItemRegistryAddr(registry.address);

    // // Set up Game with test URL
    // gameFactory = await GameFactory.deployed();
    // await gameFactory.setGlobalItemRegistryAddr(registry.address);

    // // Setup Manager Factory
    // managerFactory = await ManagerFactory.deployed();
    
    // // Set Approvals
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player1Address, gasPrice: 1});
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player2Address, gasPrice: 1});
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player3Address, gasPrice: 1});
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player4Address, gasPrice: 1});
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player5Address, gasPrice: 1});
    // await rawrToken.approve(exchange.address, web3.utils.toWei('100000', 'gwei'), {from: player6Address, gasPrice: 1});

    // /*****************************************/
    // /*****  World of Warcraft Game Data  *****/
    // /*****************************************/

    // // The following will be sent by the developer addresses
    // // Generate Game Manager
    // await managerFactory.createGameManagerContract({from: blizzardAddress});
    // worldOfWarcraftManagerAddr = await managerFactory.gameManagerAddresses(blizzardAddress, 0, {from: blizzardAddress});
    // worldOfWarcraftManager = await GameManager.at(worldOfWarcraftManagerAddr, {from: blizzardAddress});

    // // Create Game Contract
    // await worldOfWarcraftManager.generateGameContract(gameFactory.address, "http://localhost:4000/", {from: blizzardAddress});
    // gameAddr = await worldOfWarcraftManager.gameAddr();
    // game = await Game.at(gameAddr);

    // itemIds = [37,38,39,40,41,42,43,44,45,46];
    // maxAmounts = [0,0,0,0,0,0,0,0,0,0];
    // await worldOfWarcraftManager.createItemBatch(blizzardAddress, itemIds, maxAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // itemIds = [47,48,49,50,51,52,53,54,55,56];
    // await worldOfWarcraftManager.createItemBatch(blizzardAddress, itemIds, maxAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // itemIds = [57,58,59];
    // maxAmounts = [0,0,0];
    // await worldOfWarcraftManager.createItemBatch(blizzardAddress, itemIds, maxAmounts, {from:blizzardAddress, gasPrice: 1});

    // // Mint some items
    // itemIds = [40,50,51,52,49];
    // mintAmounts=[25,25,25,25,25];
    // await worldOfWarcraftManager.mintBatch(blizzardAddress, itemIds, mintAmounts, {from:blizzardAddress, gasPrice: 1});

    // // Approve developer address for sales
    // await game.setApprovalForAll(exchange.address, true, {from: blizzardAddress, gasPrice: 1});

    // // Place Items on sale
    // itemUUID = await registry.getUUID(game.address, 40);
    // await exchange.placeAsk(blizzardAddress, rawrToken.address, itemUUID, 25, web3.utils.toWei('1750000', 'gwei'), {from:blizzardAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 50);
    // await exchange.placeAsk(blizzardAddress, rawrToken.address, itemUUID, 25, web3.utils.toWei('750', 'gwei'), {from:blizzardAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 51);
    // await exchange.placeAsk(blizzardAddress, rawrToken.address, itemUUID, 25, web3.utils.toWei('750', 'gwei'), {from:blizzardAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 52);
    // await exchange.placeAsk(blizzardAddress, rawrToken.address, itemUUID, 25, web3.utils.toWei('750', 'gwei'), {from:blizzardAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 49);
    // await exchange.placeAsk(blizzardAddress, rawrToken.address, itemUUID, 25, web3.utils.toWei('750', 'gwei'), {from:blizzardAddress, gasPrice: 1});
    
    // // Mint Default assets for players
    // // Player 2
    // itemIds = [37, 40, 41];
    // mintAmounts = [5, 2, 3];
    // await worldOfWarcraftManager.mintBatch(player2Address, itemIds, mintAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // // Player 4
    // itemIds = [46, 48, 50];
    // mintAmounts = [5, 2, 3];
    // await worldOfWarcraftManager.mintBatch(player4Address, itemIds, mintAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // // Player 5
    // itemIds = [48, 51, 53];
    // mintAmounts = [5, 2, 3];
    // await worldOfWarcraftManager.mintBatch(player5Address, itemIds, mintAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // // Player 6
    // itemIds = [55, 38, 56];
    // mintAmounts = [5, 2, 3];
    // await worldOfWarcraftManager.mintBatch(player6Address, itemIds, mintAmounts, {from:blizzardAddress, gasPrice: 1});
    
    // // Approve player for Sell Orders
    // await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player4Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player5Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player6Address, gasPrice: 1});

    // // Place Player Buy/Sell orders
    // // Player 2
    // itemUUID = await registry.getUUID(game.address, 54);
    // await exchange.placeBid(player2Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('950', 'gwei'), {from:player2Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 40);
    // await exchange.placeAsk(player2Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player2Address, gasPrice: 1});

    // itemUUID = await registry.getUUID(game.address, 41);
    // await exchange.placeAsk(player2Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player2Address, gasPrice: 1});
    
    // // Player 4 
    // itemUUID = await registry.getUUID(game.address, 54);
    // await exchange.placeBid(player4Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('980', 'gwei'), {from:player4Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 48);
    // await exchange.placeAsk(player4Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player4Address, gasPrice: 1});

    // itemUUID = await registry.getUUID(game.address, 50);
    // await exchange.placeAsk(player4Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player4Address, gasPrice: 1});
    
    // // Player 5 
    // itemUUID = await registry.getUUID(game.address, 54);
    // await exchange.placeBid(player5Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1000', 'gwei'), {from:player5Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 51);
    // await exchange.placeAsk(player5Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player5Address, gasPrice: 1});

    // itemUUID = await registry.getUUID(game.address, 53);
    // await exchange.placeAsk(player5Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player5Address, gasPrice: 1});
    
    // // Player 6
    // itemUUID = await registry.getUUID(game.address, 54);
    // await exchange.placeBid(player6Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('975', 'gwei'), {from:player6Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 38);
    // await exchange.placeAsk(player6Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player6Address, gasPrice: 1});

    // itemUUID = await registry.getUUID(game.address, 56);
    // await exchange.placeAsk(player6Address, rawrToken.address, itemUUID, 2, web3.utils.toWei('1100', 'gwei'), {from:player6Address, gasPrice: 1});
};
