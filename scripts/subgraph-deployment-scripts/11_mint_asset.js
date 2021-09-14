// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

const { constants } = require('@openzeppelin/test-helpers');

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

    var mintData = [player1Address, [1], [1], 0, constants.ZERO_ADDRESS, []];
    await content.mintBatch(mintData, {from: deployerAddress});

    var assetSupply = await content.totalSupply(1);
    console.log("Asset Supply: ", assetSupply.toString());
};