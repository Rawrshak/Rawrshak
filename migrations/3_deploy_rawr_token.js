// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

module.exports = async function(deployer, network, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        // deploy RAWR token with 1,000,000,000 initial supply.
        const rawrToken = await deployProxy(RawrToken, [ web3.utils.toWei('1000000000', 'ether') ], {deployer, initializer: '__RawrToken_init'});
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};