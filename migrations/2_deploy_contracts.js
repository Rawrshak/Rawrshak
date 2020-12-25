const OVCTokenContract = artifacts.require("OVCToken");
const ManagerDeployer = artifacts.require("ManagerDeployer");
const GameManagerDeployer = artifacts.require("GameManagerDeployer");
const CraftingManagerDeployer = artifacts.require("CraftingManagerDeployer");
const LootboxManagerDeployer = artifacts.require("LootboxManagerDeployer");
const ManagerFactory = artifacts.require("ManagerFactory");
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

    // Deploy Libraries
    await deployer.deploy(Utils);
    
    // Link Library
    await deployer.link(Utils, [LootboxDeployer, LootboxFactory]);

    // Deploy Factories
    await deployer.deploy(GameDeployer);
    await deployer.deploy(CraftingDeployer);
    await deployer.deploy(LootboxDeployer);

    await deployer.link(GameDeployer, [GameFactory]);
    await deployer.link(CraftingDeployer, [CraftingFactory]);
    await deployer.link(LootboxDeployer, [LootboxFactory]);

    await deployer.deploy(GameFactory);
    await deployer.deploy(CraftingFactory);
    await deployer.deploy(LootboxFactory);

    await deployer.deploy(ManagerDeployer);
    await deployer.deploy(GameManagerDeployer);
    await deployer.deploy(CraftingManagerDeployer);
    await deployer.deploy(LootboxManagerDeployer);

    await deployer.link(ManagerDeployer, [ManagerFactory]);
    await deployer.link(GameManagerDeployer, [ManagerFactory]);
    await deployer.link(CraftingManagerDeployer, [ManagerFactory]);
    await deployer.link(LootboxManagerDeployer, [ManagerFactory]);
    
    await deployer.deploy(ManagerFactory);

    // Deploy Name Registry
    await deployer.deploy(NameRegistry);

    // deploy GlobalItemRegistry Contract
    await deployer.deploy(GlobalItemRegistry);

    // deploy Game 
    await deployer.deploy(GameManager);

    // deploy Crafting Contract
    await deployer.deploy(CraftingManager);
    
    // deploy Lootbox Contract
    await deployer.deploy(LootboxManager);

    // await deployer.deploy(ExtendedEnumerableMaps);
    // await deployer.link(ExtendedEnumerableMaps, Exchange);

    // deploy Crafting Contract
    await deployer.deploy(Exchange);
};
