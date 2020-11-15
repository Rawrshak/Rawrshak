const OVCTokenContract = artifacts.require("OVCToken");
const GameContract = artifacts.require("GameContract");
const CraftingContract = artifacts.require("CraftingContract");

module.exports = async function(deployer, networks, accounts) {
    // deploy OVC token with 1,000,000,000 initial supply.
    await deployer.deploy(OVCTokenContract, 1000000000);

    // deploy GameContract with test URL
    await deployer.deploy(GameContract, "https://testgame.com/api/item/{id}.json");
    
    // deploy Crafting Contract
    await deployer.deploy(CraftingContract);

    // Assign crafting contract the minter and burner roles
    gameContract = await GameContract.deployed();
    craftingContract = await CraftingContract.deployed();
    minter_role = await gameContract.MINTER_ROLE();
    burner_role = await gameContract.BURNER_ROLE();
    deployerAddress = accounts[0];
    gameContract.grantRole(
        minter_role,
        craftingContract.address,
        {from: deployerAddress}
    );
    gameContract.grantRole(
        burner_role,
        craftingContract.address,
        {from: deployerAddress}
    );
};
