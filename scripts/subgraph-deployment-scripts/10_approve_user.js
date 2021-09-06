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

    // var assetRoyalty = [[deployerWalletAddress, web3.utils.toWei('0.03', 'ether')]];
    // await content.approveAllSystems(true, {from: player1Address});
};