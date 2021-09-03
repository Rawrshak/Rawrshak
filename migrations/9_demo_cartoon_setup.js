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
    /*****    Cartoon Game Data    *****/
    /*****************************************/

    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: nintendoAddress});
    battlefield3ManagerAddr = await managerFactory.gameManagerAddresses(nintendoAddress, 0, {from: nintendoAddress});
    battlefield3Manager = await GameManager.at(battlefield3ManagerAddr, {from: nintendoAddress});

    // Create Game Contract
    await battlefield3Manager.generateGameContract(gameFactory.address, "http://localhost:4000/", {from: nintendoAddress});
    gameAddr = await battlefield3Manager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [13,14];
    maxAmounts = [0,0];
    mintAmounts = [10,10];
    await battlefield3Manager.createItemBatch(nintendoAddress, itemIds, maxAmounts, {from:nintendoAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(nintendoAddress, itemIds, mintAmounts, {from:nintendoAddress, gasPrice: 1});

    // Mint Default assets for players
    // Player 1 - gets all the characters
    itemIds = [13,14];
    mintAmounts = [1, 1];
    await battlefield3Manager.mintBatch(player1Address, itemIds, mintAmounts, {from:nintendoAddress, gasPrice: 1});
    
    // Player 4 - Gets Vegas character
    itemIds = [13]; 
    mintAmounts = [1];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:nintendoAddress, gasPrice: 1});
    
    // Player 5 - Gets Claire
    itemIds = [14]; 
    mintAmounts = [1];
    await battlefield3Manager.mintBatch(player5Address, itemIds, mintAmounts, {from:nintendoAddress, gasPrice: 1});

    // // // Todo: Update this for Marketplace demo
    // // Approve developer address for sales
    // await game.setApprovalForAll(exchange.address, true, {from: nintendoAddress, gasPrice: 1});

    // // Place Items on sale
    // itemUUID = await registry.getUUID(game.address, 14);
    // await exchange.placeAsk(nintendoAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:nintendoAddress, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 15);
    // await exchange.placeAsk(nintendoAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('3000', 'gwei'), {from:nintendoAddress, gasPrice: 1});

    // // Approve player for Sell Orders
    // await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player3Address, gasPrice: 1});
    // await game.setApprovalForAll(exchange.address, true, {from: player6Address, gasPrice: 1});

    // // Place Player Buy/Sell orders
    // // Player 2
    // itemUUID = await registry.getUUID(game.address, 17);
    // await exchange.placeBid(player2Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('950', 'gwei'), {from:player2Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 15);
    // await exchange.placeAsk(player2Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player2Address, gasPrice: 1});
    
    // // Player 3
    // itemUUID = await registry.getUUID(game.address, 15);
    // await exchange.placeBid(player3Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('975', 'gwei'), {from:player3Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 16);
    // await exchange.placeAsk(player3Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player3Address, gasPrice: 1});
    
    // // Player 6 
    // itemUUID = await registry.getUUID(game.address, 14);
    // await exchange.placeBid(player6Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('980', 'gwei'), {from:player6Address, gasPrice: 1});
    
    // itemUUID = await registry.getUUID(game.address, 16);
    // await exchange.placeAsk(player6Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player6Address, gasPrice: 1});

};
