// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const ContentManager = artifacts.require("ContentManager");
const Content = artifacts.require("Content");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
    ] = accounts;

    // get the content manager contract
    const contentManager = await ContentManager.deployed();
    console.log("Content Manager: ", contentManager.address);

    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 0, [[deployerWalletAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []]
    ];
    await contentManager.addAssetBatch(asset);
    const content = await Content.deployed();
    console.log("1 maxSupply: ", await content.maxSupply(1));
    console.log("2 maxSupply: ", await content.maxSupply(2));
};