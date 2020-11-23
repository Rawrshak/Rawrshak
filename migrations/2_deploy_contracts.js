const OVCTokenContract = artifacts.require("OVCToken");
const Game = artifacts.require("Game");
const Crafting = artifacts.require("Crafting");
const Lootbox = artifacts.require("Lootbox");
const Utils = artifacts.require("Utils");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, 1000000000);
    ovcTokenContract = await OVCTokenContract.deployed();

    // deploy Game with test URL
    await deployer.deploy(Game, "https://testgame.com/api/item/{id}.json");
    
    // Link Library
    await deployer.deploy(Utils);
    await deployer.link(Utils, [Crafting, Lootbox]);

    // deploy Crafting Contract
    await deployer.deploy(Crafting, ovcTokenContract.address);
    
    // deploy Crafting Contract
    await deployer.deploy(Lootbox, "https://testgame.com/api/lootbox/{id}.json");

    // Assign crafting contract the minter and burner roles
    game = await Game.deployed();
    crafting = await Crafting.deployed();
    lootbox = await Lootbox.deployed();
    minter_role = await game.MINTER_ROLE();
    burner_role = await game.BURNER_ROLE();
    deployerAddress = accounts[0];
    await game.grantRole(minter_role, crafting.address, {from: deployerAddress});
    await game.grantRole(burner_role, crafting.address, {from: deployerAddress});
    await game.grantRole(minter_role, lootbox.address, {from: deployerAddress});
    await game.grantRole(burner_role, lootbox.address, {from: deployerAddress});
        
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
