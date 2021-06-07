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
        player2Address,
    ] = accounts;

    // get the content manager contract
    const content = await Content.deployed();
    console.log("Content: ", content.address);

    await content.safeTransferFrom(player1Address, player2Address, 1, 1, 0, {from: player1Address});
};