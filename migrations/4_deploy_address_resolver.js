// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// AddressResolver
const AddressResolver = artifacts.require("AddressResolver");

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

module.exports = async function(deployer, network, accounts) {

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const resolver = await deployProxy(AddressResolver, [], {deployer, initializer: '__AddressResolver_init'});
        
        const rawrToken = await RawrToken.deployed();
        await resolver.registerAddress(["0x3d13c043"], [rawrToken.address]);
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};