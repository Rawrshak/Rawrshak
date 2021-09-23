// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// Content Factory
const ContentFactory = artifacts.require("ContentFactory");
const AccessControlManager = artifacts.require("AccessControlManager");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");

module.exports = async function(deployer, network, accounts) {
    // [
    //     deployerAddress,            // Address that deployed contracts
    //     deployerWalletAddress,      // Developer wallet address
    //     player1Address,             // Player 1 test address
    //     player2Address,             // Player 2 test address
    //     player3Address              // Player 3 test address
    // ] = accounts;

    // if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
    //     const accessControlManager = await deployProxy(AccessControlManager, [], {deployer, initializer: false});
    //     const content = await deployProxy(Content, [], {deployer, initializer: false});
    //     const contentStorage = await deployProxy(ContentStorage, [], {deployer, initializer: false});
    //     const contentManager = await deployProxy(ContentManager, [], {deployer, initializer: false});
    //     const factory = await deployProxy(
    //         ContentFactory,
    //         [content.address, contentManager.address, contentStorage.address, accessControlManager.address],
    //         {
    //             deployer,
    //             initializer: '__ContentFactory_init'
    //         }
    //     );
    // }

    // // Note: TransparentUpgradeProxy is the address we talk to.
};