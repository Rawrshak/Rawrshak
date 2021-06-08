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


    // approve the systems
    // await content.approveAllSystems(true, {from: player1Address});
    
    var asset1 = await content.balanceOf(player1Address, 1);
    var asset3 = await content.balanceOf(player1Address, 3);
    console.log("Asset 1: ", asset1.toString());
    console.log("Asset 3: ", asset3.toString());

    var asset7 = await content.balanceOf(player1Address, 7);
    console.log("Asset 7: ", asset7.toString());
    // Salvage
    // await craft.craft(2, 1, {from: player1Address});

    // await content.mintBatch(mintData, {from: deployerAddress});
};