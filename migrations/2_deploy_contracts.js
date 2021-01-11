const OVCTokenContract = artifacts.require("OVCToken");
const GameManagerDeployer = artifacts.require("GameManagerDeployer");
const CraftingManagerDeployer = artifacts.require("CraftingManagerDeployer");
const LootboxManagerDeployer = artifacts.require("LootboxManagerDeployer");
const ManagerFactory = artifacts.require("ManagerFactory");
const GameDeployer = artifacts.require("GameDeployer");
const CraftingDeployer = artifacts.require("CraftingDeployer");
const LootboxDeployer = artifacts.require("LootboxDeployer");
const GameFactory = artifacts.require("GameFactory");
const CraftingFactory = artifacts.require("CraftingFactory");
const LootboxFactory = artifacts.require("LootboxFactory");
const Utils = artifacts.require("Utils");
const NameRegistry = artifacts.require("NameRegistry");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");
const ExtendedEnumerableMaps = artifacts.require("ExtendedEnumerableMaps");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, web3.utils.toWei('1000000000', 'gwei'));

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

    await deployer.deploy(GameManagerDeployer);
    await deployer.deploy(CraftingManagerDeployer);
    await deployer.deploy(LootboxManagerDeployer);

    await deployer.link(GameManagerDeployer, [ManagerFactory]);
    await deployer.link(CraftingManagerDeployer, [ManagerFactory]);
    await deployer.link(LootboxManagerDeployer, [ManagerFactory]);
    
    await deployer.deploy(ManagerFactory);

    // Deploy Name Registry
    await deployer.deploy(NameRegistry);

    // deploy GlobalItemRegistry Contract
    await deployer.deploy(GlobalItemRegistry);

    // await deployer.deploy(ExtendedEnumerableMaps);
    // await deployer.link(ExtendedEnumerableMaps, Exchange);

    // deploy Crafting Contract
    await deployer.deploy(Exchange);
};
