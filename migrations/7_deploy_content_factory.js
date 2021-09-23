// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// Address Resolver Contract
const AddressResolver = artifacts.require("AddressResolver");

// Content Factory
const ContentFactory = artifacts.require("ContentFactory");
const AccessControlManager = artifacts.require("AccessControlManager");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");

module.exports = async function(deployer, network, accounts) {

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const accessControlManager = await AccessControlManager.new();
        const content = await Content.new();
        const contentStorage = await ContentStorage.new();
        const contentManager = await ContentManager.new();
        const factory = await deployProxy(
            ContentFactory,
            [content.address, contentManager.address, contentStorage.address, accessControlManager.address],
            {
                deployer,
                initializer: '__ContentFactory_init'
            }
        );

        // Register Liquidity Minter in the resolver 
        const resolver = await AddressResolver.deployed();
        await resolver.registerAddress(["0xdb337f7d"], [factory.address]);
    }

    // Note: TransparentUpgradeProxy is the address we talk to.
};