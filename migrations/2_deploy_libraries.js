// Library Contracts
const Constants = artifacts.require("LibInterfaces");
const Asset = artifacts.require("LibAsset");
const Royalties = artifacts.require("LibRoyalties");
const Order = artifacts.require("LibOrder");

// V2 Implementation
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");

// Exchange Contracts
const Exchange = artifacts.require("Exchange");
const ExecutionManager = artifacts.require("ExecutionManager");
const NftEscrow = artifacts.require("NftEscrow");
const Orderbook = artifacts.require("Orderbook");
const RoyaltyManager = artifacts.require("RoyaltyManager");

module.exports = async function(deployer, networks, accounts) {
    // Deploy Libraries
    await deployer.deploy(Constants);
    await deployer.deploy(Asset);
    await deployer.deploy(Royalties);
    await deployer.deploy(Order);

    await deployer.link(Constants, [Content, ContentStorage, ContentManager, AccessControlManager]);
    await deployer.link(Asset, [Content, ContentStorage, ContentManager, AccessControlManager]);
    await deployer.link(Royalties, [Content, ContentStorage, ContentManager]);
    await deployer.link(Order, [Exchange, ExecutionManager, NftEscrow, Orderbook, RoyaltyManager]);
};