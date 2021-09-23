// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

module.exports = async function(deployer, network, accounts) {

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        // deploy RAWR token with 1,000,000,000 initial supply.
        const rawrToken = await deployProxy(RawrToken, [ web3.utils.toWei('1000000000', 'ether') ], {deployer, initializer: '__RawrToken_init'});
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};