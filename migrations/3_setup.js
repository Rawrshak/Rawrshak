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
    // await ovcTokenContract.approve(deployerAddress, 1000000, {from:deployerAddress});
    // await ovcTokenContract.transfer(player1Address, 10000, {from:deployerAddress});
    // await ovcTokenContract.transfer(player2Address, 5000, {from:deployerAddress});
    // await ovcTokenContract.transfer(player3Address, 15000, {from:deployerAddress});

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
    await gameManager.grantRole(minter_role, craftingAddr, {from: deployerAddress});
    await gameManager.grantRole(burner_role, craftingAddr, {from: deployerAddress});
    await gameManager.grantRole(minter_role, lootboxAddr, {from: deployerAddress});
    await gameManager.grantRole(burner_role, lootboxAddr, {from: deployerAddress});
    
    // Todo: Add some test items

        
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
