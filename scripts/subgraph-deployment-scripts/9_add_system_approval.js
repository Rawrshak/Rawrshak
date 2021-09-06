// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const ContentManager = artifacts.require("ContentManager");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        deployerAltAddress,      // Developer wallet address
    ] = accounts;

    // get the content manager contract
    const contentManager = await ContentManager.deployed();
    console.log("Content Manager: ", contentManager.address);

    var approvalPair = [[deployerAddress, true]];

    // var assetRoyalty = [[deployerWalletAddress, web3.utils.toWei('0.03', 'ether')]];
    await contentManager.registerOperators(approvalPair);
};