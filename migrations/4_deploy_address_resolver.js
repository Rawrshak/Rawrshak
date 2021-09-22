// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// AddressResolver Token
const AddressResolver = artifacts.require("AddressResolver");

module.exports = async function(deployer, network, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const resolver = await deployProxy(AddressResolver, [], {deployer, initializer: '__AddressResolver_init'});
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};