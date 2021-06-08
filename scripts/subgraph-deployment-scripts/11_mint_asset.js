// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const Content = artifacts.require("Content");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        deployerAltAddress,      // Developer wallet address
        player1Address,
    ] = accounts;

    // get the content manager contract
    const content = await Content.deployed();
    console.log("Content: ", content.address);

    const zeroAddress = "0x0000000000000000000000000000000000000000";
    var mintData = [player1Address, [1], [1], 0, zeroAddress, []];
    await content.mintBatch(mintData, {from: deployerAddress});

    var assetSupply = await content.supply(1);
    console.log("Asset Supply: ", assetSupply.toString());
};