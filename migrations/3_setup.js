const OVCTokenContract = artifacts.require("OVCToken");
const ManagerFactory = artifacts.require("ManagerFactory");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const Crafting = artifacts.require("Crafting");
const CraftingManager = artifacts.require("CraftingManager");
const CraftingFactory = artifacts.require("CraftingFactory");
const Lootbox = artifacts.require("Lootbox");
const LootboxManager = artifacts.require("LootboxManager");
const LootboxFactory = artifacts.require("LootboxFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer, networks, accounts) {
    deployerAddress = accounts[0];
    deployerWalletAddress = accounts[1];
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    // get OVC token with 1,000,000,000 initial supply and send some
    ovcTokenContract = await OVCTokenContract.deployed();
    await ovcTokenContract.approve(deployerAddress, 1000000, {from:deployerAddress});
    await ovcTokenContract.transfer(player1Address, 10000, {from:deployerAddress});
    await ovcTokenContract.transfer(player2Address, 5000, {from:deployerAddress});
    await ovcTokenContract.transfer(player3Address, 15000, {from:deployerAddress});

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

    // Set up Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    // Set up Crafting Contract
    craftingFactory = await CraftingFactory.deployed();
    await craftingFactory.setGlobalItemRegistryAddr(registry.address);

    // Set up Lootbox Contract
    lootboxFactory = await LootboxFactory.deployed();
    await lootboxFactory.setGlobalItemRegistryAddr(registry.address);
    
    // Set up Crafting Contract
    exchange = await Exchange.deployed();
    await exchange.setGlobalItemRegistryAddr(registry.address);

    // Setup Manager Factory
    managerFactory = await ManagerFactory.deployed();

    // Generate Game Manager
    await managerFactory.createGameManagerContract();
    gameManagerAddr = await managerFactory.gameManagerAddresses(deployerAddress, 0);
    gameManager = await GameManager.at(gameManagerAddr);

    // Create Game Contract
    await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");
    gameAddr = await gameManager.gameAddr();
    game = await Game.at(gameAddr);
    
    // Generate Crafting Manager
    await managerFactory.createCraftingManagerContract();
    craftingManagerAddr = await managerFactory.craftingManagerAddresses(deployerAddress, 0);
    craftingManager = await CraftingManager.at(craftingManagerAddr);

    // Create Crafting Contract
    await craftingManager.generateCraftingContract(craftingFactory.address);
    craftingAddr = await craftingManager.craftingAddr();
    crafting = await Crafting.at(craftingAddr);
    await craftingManager.setGlobalItemRegistryAddr(registry.address);
    await craftingManager.setDeveloperWallet(deployerWalletAddress);

    // Generate Lootbox Manager
    await managerFactory.createLootboxManagerContract();
    lootboxManagerAddr = await managerFactory.lootboxManagerAddresses(deployerAddress, 0);
    lootboxManager = await LootboxManager.at(lootboxManagerAddr);

    // Create Lootbox Contract
    await lootboxManager.generateLootboxContract(lootboxFactory.address, "https://testgame.com/api/lootbox/{id}.json");
    lootboxAddr = await lootboxManager.getLootboxAddress(0);
    lootbox = await Lootbox.at(lootboxAddr);
    await lootboxManager.setGlobalItemRegistryAddr(registry.address);

    // Set crafting and lootbox address as both minter and burner
    minter_role = await gameManager.MINTER_ROLE();
    burner_role = await gameManager.BURNER_ROLE();
    await gameManager.grantRole(minter_role, craftingAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(burner_role, craftingAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(minter_role, lootboxAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(burner_role, lootboxAddr, {from: deployerAddress, gasPrice: 1});
    
    // Game Data
    // Add some test items
    [material1, material2, material3] = [0,1,2];
    await gameManager.createItem(player1Address, material1, 0, {from:deployerAddress, gasPrice: 1});
    await gameManager.createItem(player1Address, material2, 2, {from:deployerAddress, gasPrice: 1});
    await gameManager.createItem(player2Address, material3, 3, {from:deployerAddress, gasPrice: 1});
    await gameManager.mint(player3Address, material1, 15, {from:deployerAddress, gasPrice: 1});

    // mint batch
    [reward1, reward2, reward3] = [10,11,12];
    rewards = [reward1, reward2, reward3];
    amounts = [0,0,0];
    mintAmounts = [1,1,1];
    await gameManager.createItemBatch(deployerAddress, rewards, amounts, {from:deployerAddress, gasPrice: 1});
    await gameManager.mintBatch(player1Address, rewards, mintAmounts, {from:deployerAddress, gasPrice: 1});

    // burn
    await gameManager.burn(player3Address, material1, 7, {from:deployerAddress, gasPrice: 1});

    // Exchange Data
    // Create 2 Bids and 2 Asks
    await ovcTokenContract.approve(exchange.address, 500, {from: player2Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player3Address, gasPrice: 1});
    
    uuid1 = await registry.getUUID(game.address, material1);
    uuid2 = await registry.getUUID(game.address, material2);
    uuid3 = await registry.getUUID(game.address, material3);

    // Player 2 wants to buy Mat1 and Mat2
    bidPlacedEvent = await exchange.placeBid(player2Address, ovcTokenContract.address, uuid1, 1, 100);
    await exchange.placeBid(player2Address, ovcTokenContract.address, uuid2, 2, 100);

    // Player 2 is selling Mat3
    // Player 3 is selling Mat1
    askPlacedEvent = await exchange.placeAsk(player2Address, ovcTokenContract.address, uuid3, 1, 200);
    askPlacedEvent2 = await exchange.placeAsk(player3Address, ovcTokenContract.address, uuid1, 1, 300);

    // Delete 1 Bid
    orderId = bidPlacedEvent.logs[0].args[6];
    await exchange.deleteOrder(orderId, {from: player2Address, gasPrice: 1});

    // Fullfill asks
    orderId = askPlacedEvent.logs[0].args[6];
    await ovcTokenContract.approve(exchange.address, 500, {from: player1Address, gasPrice: 1});
    await exchange.fullfillOrder(orderId, {from: player1Address, gasPrice: 1});
    
    orderId = askPlacedEvent2.logs[0].args[6];
    await exchange.fullfillOrder(orderId, {from: player1Address, gasPrice: 1});

    // Claim Player 2 sold material
    await exchange.claim(orderId, {from: player2Address, gasPrice: 1});
        




    
    // // Note: This is for debugging purposes
    // gc_manager_role = await game.MANAGER_ROLE();
    // await game.grantRole(gc_manager_role, deployerAddress, {from:deployerAddress, gasPrice: 1});

    // await game.methods['createItem(uint256)'](1, {from:deployerAddress, gasPrice: 1});
    // await game.methods['createItem(uint256)'](2, {from:deployerAddress, gasPrice: 1});
    // await game.methods['createItem(uint256)'](3, {from:deployerAddress, gasPrice: 1});
    // await game.methods['createItem(uint256)'](4, {from:deployerAddress, gasPrice: 1});
    // await game.methods['createItem(uint256)'](5, {from:deployerAddress, gasPrice: 1});

    // cc_manager_role = await crafting.MANAGER_ROLE();
    // await crafting.grantRole(cc_manager_role, deployerAddress, {from:deployerAddress, gasPrice: 1});

    // // await crafting.registerCraftingMaterial.call(game.address,1,{from:deployerAddress, gasPrice: 1})
    // await crafting.registerCraftingMaterial(game.address,1,{from:deployerAddress, gasPrice: 1});
    // await crafting.registerCraftingMaterial(game.address,2,{from:deployerAddress, gasPrice: 1});
    // await crafting.registerCraftingMaterial(game.address,3,{from:deployerAddress, gasPrice: 1});
    // await crafting.registerCraftingReward(game.address,4,{from:deployerAddress, gasPrice: 1});
    // await crafting.registerCraftingReward(game.address,5,{from:deployerAddress, gasPrice: 1});
};
