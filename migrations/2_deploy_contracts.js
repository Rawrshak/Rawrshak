const OVCTokenContract = artifacts.require("OVCToken");
// const Game = artifacts.require("Game");
const GameDeployer = artifacts.require("GameDeployer");
const CraftingDeployer = artifacts.require("CraftingDeployer");
const LootboxDeployer = artifacts.require("LootboxDeployer");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const CraftingManager = artifacts.require("CraftingManager");
const CraftingFactory = artifacts.require("CraftingFactory");
// const Lootbox = artifacts.require("Lootbox");
const LootboxManager = artifacts.require("LootboxManager");
const LootboxFactory = artifacts.require("LootboxFactory");
const Utils = artifacts.require("Utils");
const NameRegistry = artifacts.require("NameRegistry");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");
const ExtendedEnumerableMaps = artifacts.require("ExtendedEnumerableMaps");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, 1000000000);
    ovcTokenContract = await OVCTokenContract.deployed();

    // Deploy Libraries
    await deployer.deploy(Utils);
    
    // Link Library
    await deployer.link(Utils, [LootboxDeployer, LootboxFactory]);
    
    await deployer.deploy(GameDeployer);
    await deployer.deploy(CraftingDeployer);
    await deployer.deploy(LootboxDeployer);

    // Deploy Factories
    await deployer.link(GameDeployer, [GameFactory]);
    await deployer.link(CraftingDeployer, [CraftingFactory]);
    await deployer.link(LootboxDeployer, [LootboxFactory]);

    await deployer.deploy(GameFactory);
    await deployer.deploy(CraftingFactory);
    await deployer.deploy(LootboxFactory);

    // Deploy Name Registry
    await deployer.deploy(NameRegistry);

    // deploy GlobalItemRegistry Contract
    await deployer.deploy(GlobalItemRegistry);
    registry = await GlobalItemRegistry.deployed();

    // deploy Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    await deployer.deploy(GameManager);
    gameManager = await GameManager.deployed();
    await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");

    // deploy Crafting Contract
    craftingFactory = await CraftingFactory.deployed();
    await craftingFactory.setGlobalItemRegistryAddr(registry.address);

    await deployer.deploy(CraftingManager);
    craftingManager = await CraftingManager.deployed();
    await craftingManager.generateCraftingContract(craftingFactory.address);
    await craftingManager.setGlobalItemRegistryAddr(registry.address);
    
    // deploy Lootbox Contract
    lootboxFactory = await LootboxFactory.deployed();
    await lootboxFactory.setGlobalItemRegistryAddr(registry.address);

    await deployer.deploy(LootboxManager);
    lootboxManager = await LootboxManager.deployed();
    lootboxEvent = await lootboxManager.generateLootboxContract(lootboxFactory.address, "https://testgame.com/api/lootbox/{id}.json");
    lootboxId = lootboxEvent.logs[0].args[0];
    await lootboxManager.setGlobalItemRegistryAddr(registry.address);

    await deployer.deploy(ExtendedEnumerableMaps);
    await deployer.link(ExtendedEnumerableMaps, Exchange);

    // deploy Crafting Contract
    await deployer.deploy(Exchange, registry.address);

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
