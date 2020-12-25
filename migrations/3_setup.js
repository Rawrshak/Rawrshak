const OVCTokenContract = artifacts.require("OVCToken");
const GameDeployer = artifacts.require("GameDeployer");
const CraftingDeployer = artifacts.require("CraftingDeployer");
const LootboxDeployer = artifacts.require("LootboxDeployer");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const CraftingManager = artifacts.require("CraftingManager");
const CraftingFactory = artifacts.require("CraftingFactory");
const LootboxManager = artifacts.require("LootboxManager");
const LootboxFactory = artifacts.require("LootboxFactory");
const Utils = artifacts.require("Utils");
const NameRegistry = artifacts.require("NameRegistry");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");
const ExtendedEnumerableMaps = artifacts.require("ExtendedEnumerableMaps");

module.exports = async function(deployer, networks, accounts) {
    // get OVC token with 1,000,000,000 initial supply.
    ovcTokenContract = await OVCTokenContract.deployed();

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

    // Set up Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    gameManager = await GameManager.deployed();
    await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");

    // Set up Crafting Contract
    craftingFactory = await CraftingFactory.deployed();
    await craftingFactory.setGlobalItemRegistryAddr(registry.address);

    craftingManager = await CraftingManager.deployed();
    await craftingManager.generateCraftingContract(craftingFactory.address);
    await craftingManager.setGlobalItemRegistryAddr(registry.address);
    
    // Set up Lootbox Contract
    lootboxFactory = await LootboxFactory.deployed();
    await lootboxFactory.setGlobalItemRegistryAddr(registry.address);

    lootboxManager = await LootboxManager.deployed();
    lootboxEvent = await lootboxManager.generateLootboxContract(lootboxFactory.address, "https://testgame.com/api/lootbox/{id}.json");
    lootboxId = lootboxEvent.logs[0].args[0];
    await lootboxManager.setGlobalItemRegistryAddr(registry.address);

    // Set up Crafting Contract
    exchange = await Exchange.deployed();
    await exchange.setGlobalItemRegistryAddr(registry.address);

    // Assign crafting contract the minter and burner roles
    craftingAddress = await craftingManager.getCraftingAddress();
    lootboxAddress = await lootboxManager.getLootboxAddress(lootboxId);
    minter_role = await gameManager.MINTER_ROLE();
    burner_role = await gameManager.BURNER_ROLE();
    deployerAddress = accounts[0];
    await gameManager.grantRole(minter_role, craftingAddress, {from: deployerAddress});
    await gameManager.grantRole(burner_role, craftingAddress, {from: deployerAddress});
    await gameManager.grantRole(minter_role, lootboxAddress, {from: deployerAddress});
    await gameManager.grantRole(burner_role, lootboxAddress, {from: deployerAddress});
        
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
