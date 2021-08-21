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
    /*****    Basic Weapons Pack Game Data    *****/
    /*****************************************/

    // The following will be sent by the developer addresses
    // Generate Game Manager
    await managerFactory.createGameManagerContract({from: deployerAddress});
    battlefield3ManagerAddr = await managerFactory.gameManagerAddresses(deployerAddress, 0, {from: deployerAddress});
    battlefield3Manager = await GameManager.at(battlefield3ManagerAddr, {from: deployerAddress});

    // Create Game Contract
    await battlefield3Manager.generateGameContract(gameFactory.address, "http://localhost:4000/", {from: deployerAddress});
    gameAddr = await battlefield3Manager.gameAddr();
    game = await Game.at(gameAddr);

    itemIds = [27,28,29,30,31,32,33,34,35,36];
    maxAmounts = [0,0,0,0,0,0,0,0,0,0];
    mintAmounts = [20,20,20,20,20,20,20,20,20,20];
    await battlefield3Manager.createItemBatch(deployerAddress, itemIds, maxAmounts, {from:deployerAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(deployerAddress, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});
    
    itemIds = [37,38,39,40,41,42,43,44,45,46];
    await battlefield3Manager.createItemBatch(deployerAddress, itemIds, maxAmounts, {from:deployerAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(deployerAddress, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});
    
    itemIds = [47];
    maxAmounts = [0];
    mintAmounts = [20];
    await battlefield3Manager.createItemBatch(deployerAddress, itemIds, maxAmounts, {from:deployerAddress, gasPrice: 1});
    await battlefield3Manager.mintBatch(deployerAddress, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});

    // Approve developer address for sales
    await game.setApprovalForAll(exchange.address, true, {from: deployerAddress, gasPrice: 1});

    // Place Items on sale
    itemUUID = await registry.getUUID(game.address, 27);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 28);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 29);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 30);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 31);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 32);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 33);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 34);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 35);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 36);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 37);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 38);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 39);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 40);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 41);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 42);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 43);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 44);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 45);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 46);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});
    
    itemUUID = await registry.getUUID(game.address, 47);
    await exchange.placeAsk(deployerAddress, rawrToken.address, itemUUID, 10, web3.utils.toWei('3000', 'gwei'), {from:deployerAddress, gasPrice: 1});

    // Mint Default assets for players
    // Player 4
    itemIds = [27,28,29,30,31,32,33,34,35,36];
    mintAmounts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});

    itemIds = [37,38,39,40,41,42,43,44,45,46];
    mintAmounts = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});
    
    itemIds = [47];
    mintAmounts = [1];
    await battlefield3Manager.mintBatch(player4Address, itemIds, mintAmounts, {from:deployerAddress, gasPrice: 1});
}
