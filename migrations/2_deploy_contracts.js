const OVCTokenContract = artifacts.require("OVCToken");
const GameContract = artifacts.require("GameContract");
const CraftingContract = artifacts.require("CraftingContract");
const LootBoxContract = artifacts.require("LootBoxContract");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, 1000000000);
    ovcTokenContract = await OVCTokenContract.deployed();

    // deploy GameContract with test URL
    await deployer.deploy(GameContract, "https://testgame.com/api/item/{id}.json");
    
    // deploy Crafting Contract
    await deployer.deploy(CraftingContract, ovcTokenContract.address);
    
    // deploy Crafting Contract
    await deployer.deploy(LootBoxContract);

    // Assign crafting contract the minter and burner roles
    gameContract = await GameContract.deployed();
    craftingContract = await CraftingContract.deployed();
    minter_role = await gameContract.MINTER_ROLE();
    burner_role = await gameContract.BURNER_ROLE();
    deployerAddress = accounts[0];
    gameContract.grantRole(minter_role,craftingContract.address,{from: deployerAddress});
    gameContract.grantRole(burner_role,craftingContract.address,{from: deployerAddress});

    // // Note: This is for debugging purposes
    // gc_manager_role = await gameContract.MANAGER_ROLE();
    // await gameContract.grantRole(gc_manager_role, deployerAddress, {from:deployerAddress, gasPrice: 1});

    // await gameContract.methods['createItem(uint256)'](1, {from:deployerAddress, gasPrice: 1});
    // await gameContract.methods['createItem(uint256)'](2, {from:deployerAddress, gasPrice: 1});
    // await gameContract.methods['createItem(uint256)'](3, {from:deployerAddress, gasPrice: 1});
    // await gameContract.methods['createItem(uint256)'](4, {from:deployerAddress, gasPrice: 1});
    // await gameContract.methods['createItem(uint256)'](5, {from:deployerAddress, gasPrice: 1});

    // cc_manager_role = await craftingContract.MANAGER_ROLE();
    // await craftingContract.grantRole(cc_manager_role, deployerAddress, {from:deployerAddress, gasPrice: 1});

    // // await craftingContract.registerCraftingMaterial.call(gameContract.address,1,{from:deployerAddress, gasPrice: 1})
    // await craftingContract.registerCraftingMaterial(gameContract.address,1,{from:deployerAddress, gasPrice: 1});
    // await craftingContract.registerCraftingMaterial(gameContract.address,2,{from:deployerAddress, gasPrice: 1});
    // await craftingContract.registerCraftingMaterial(gameContract.address,3,{from:deployerAddress, gasPrice: 1});
    // await craftingContract.registerCraftingReward(gameContract.address,4,{from:deployerAddress, gasPrice: 1});
    // await craftingContract.registerCraftingReward(gameContract.address,5,{from:deployerAddress, gasPrice: 1});
};
