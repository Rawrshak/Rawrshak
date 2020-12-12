const OVCTokenContract = artifacts.require("OVCToken");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const Crafting = artifacts.require("Crafting");
const Lootbox = artifacts.require("Lootbox");
const LootboxManager = artifacts.require("LootboxManager");
const Utils = artifacts.require("Utils");
const NameRegistry = artifacts.require("NameRegistry");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");
const ExtendedEnumerableMaps = artifacts.require("ExtendedEnumerableMaps");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, 1000000000);
    ovcTokenContract = await OVCTokenContract.deployed();

    // Deploy Name Registry
    await deployer.deploy(NameRegistry);

    // deploy GlobalItemRegistry Contract
    await deployer.deploy(GlobalItemRegistry);
    registry = await GlobalItemRegistry.deployed();

    // deploy Game with test URL
    await deployer.deploy(Game, "https://testgame.com/api/item/{id}.json", registry.address);
    game = await Game.deployed();

    await deployer.deploy(GameManager, game.address);
    gameManager = await GameManager.deployed();
    await game.setGameManagerAddress(gameManager.address)
    
    // Link Library
    await deployer.deploy(Utils);
    await deployer.link(Utils, [Crafting, Lootbox]);

    // deploy Crafting Contract
    await deployer.deploy(Crafting, ovcTokenContract.address, registry.address);
    
    // deploy Lootbox Contract
    await deployer.deploy(Lootbox, "https://testgame.com/api/lootbox/{id}.json");
    await deployer.deploy(LootboxManager);
    lootbox = await Lootbox.deployed();
    lootboxManager = await LootboxManager.deployed();
    await lootbox.setGlobalItemRegistryAddr(registry.address);
    await lootboxManager.setGlobalItemRegistryAddr(registry.address);
    await lootboxManager.setLootboxAddress(lootbox.address);
    await lootbox.setLootboxManager(lootboxManager.address);

    await deployer.deploy(ExtendedEnumerableMaps);
    await deployer.link(ExtendedEnumerableMaps, Exchange);

    // deploy Crafting Contract
    await deployer.deploy(Exchange, registry.address);

    // Assign crafting contract the minter and burner roles
    crafting = await Crafting.deployed();
    lootbox = await Lootbox.deployed();
    minter_role = await gameManager.MINTER_ROLE();
    burner_role = await gameManager.BURNER_ROLE();
    deployerAddress = accounts[0];
    await gameManager.grantRole(minter_role, crafting.address, {from: deployerAddress});
    await gameManager.grantRole(burner_role, crafting.address, {from: deployerAddress});
    await gameManager.grantRole(minter_role, lootbox.address, {from: deployerAddress});
    await gameManager.grantRole(burner_role, lootbox.address, {from: deployerAddress});
        
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
