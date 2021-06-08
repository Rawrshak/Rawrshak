// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const Content = artifacts.require("Content");
const Salvage = artifacts.require("Salvage");
const Craft = artifacts.require("Craft");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        deployerAltAddress,      // Developer wallet address
        player1Address,
    ] = accounts;

    const content = await Content.deployed();
    const craft = await Craft.deployed();
    const salvage = await Salvage.deployed();

    // // unpause: temp
    // await craft.managerSetPause(false, {from: deployerAddress});
    // await salvage.managerSetPause(false, {from: deployerAddress});

    // var asset4 = await content.balanceOf(player1Address, 4);
    // var asset3 = await content.balanceOf(player1Address, 3);
    // console.log("Asset 4: ", asset4.toString());
    // console.log("Asset 3: ", asset3.toString());

    // approve the systems
    await content.approveAllSystems(true, {from: player1Address});

    // Salvage
    await salvage.salvage([content.address, 4], 2, {from: player1Address});

    // await content.mintBatch(mintData, {from: deployerAddress});

    // var assetSupply = await content.supply(1);
    // console.log("Asset Supply: ", assetSupply.toString());
};