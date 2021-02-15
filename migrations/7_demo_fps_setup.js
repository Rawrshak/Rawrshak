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
    /*****    Battlefield 3 Game Data    *****/
    /*****************************************/

    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: electronicArtsAddress});
    battlefield3ManagerAddr = await managerFactory.gameManagerAddresses(electronicArtsAddress, 0, {from: electronicArtsAddress});
    battlefield3Manager = await GameManager.at(battlefield3ManagerAddr, {from: electronicArtsAddress});

    // Create Game Contract
    await battlefield3Manager.generateGameContract(gameFactory.address, "http://localhost:4000/", {from: electronicArtsAddress});
    gameAddr = await battlefield3Manager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [0,1,2,3,4,5,6,7];
    maxAmounts = [0,0,0,0,0,0,0,0];
    mintAmounts = [50,50,50,50,5,0,0,0];
    await battlefield3Manager.createItemBatch(electronicArtsAddress, itemIds, maxAmounts, {from:electronicArtsAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(electronicArtsAddress, itemIds, mintAmounts, {from:electronicArtsAddress, gasPrice: 1});
    
    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: electronicArtsAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 0);
    await exchange.placeAsk(electronicArtsAddress, rawrToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:electronicArtsAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 1);
    await exchange.placeAsk(electronicArtsAddress, rawrToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:electronicArtsAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 2);
    await exchange.placeAsk(electronicArtsAddress, rawrToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:electronicArtsAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 3);
    await exchange.placeAsk(electronicArtsAddress, rawrToken.address, itemUUID, 50, web3.utils.toWei('1000', 'gwei'), {from:electronicArtsAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 4);
    await exchange.placeAsk(electronicArtsAddress, rawrToken.address, itemUUID, 5, web3.utils.toWei('1000', 'gwei'), {from:electronicArtsAddress, gasPrice: 1});

    // Mint Default assets for players
    // Player 1
    itemIds = [0, 1, 4];
    mintAmounts = [1, 3, 1];
    await battlefield3Manager.mintBatch(player1Address, itemIds, mintAmounts, {from:electronicArtsAddress, gasPrice: 1});
    
    // Player 2
    itemIds = [0, 2, 5];
    await battlefield3Manager.mintBatch(player2Address, itemIds, mintAmounts, {from:electronicArtsAddress, gasPrice: 1});
    
    // Player 3
    itemIds = [0, 3, 6];
    await battlefield3Manager.mintBatch(player3Address, itemIds, mintAmounts, {from:electronicArtsAddress, gasPrice: 1});
    
    // Player 4
    itemIds = [2, 3, 7];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:electronicArtsAddress, gasPrice: 1});

    // Approve player for Sell Orders
    await game.setApprovalForAll(exchange.address, true, {from: player1Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player3Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player4Address, gasPrice: 1});

    // Place Player Buy/Sell orders
    // Player 1 
    itemUUID = await registry.getUUID(game.address, 5);
    await exchange.placeBid(player1Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('950', 'gwei'), {from:player1Address, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 1);
    await exchange.placeAsk(player1Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player1Address, gasPrice: 1});
    
    // Player 2 
    itemUUID = await registry.getUUID(game.address, 6);
    await exchange.placeBid(player2Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('975', 'gwei'), {from:player2Address, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 2);
    await exchange.placeAsk(player2Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player2Address, gasPrice: 1});
    
    // Player 3 
    itemUUID = await registry.getUUID(game.address, 7);
    await exchange.placeBid(player3Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('980', 'gwei'), {from:player3Address, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 3);
    await exchange.placeAsk(player3Address, rawrToken.address, itemUUID, 1, web3.utils.toWei('1100', 'gwei'), {from:player3Address, gasPrice: 1});

};
