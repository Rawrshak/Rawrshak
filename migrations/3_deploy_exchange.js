// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// V2 Exchange Contracts
const Exchange = artifacts.require("Exchange");
const AddressRegistry = artifacts.require("AddressRegistry");
const EscrowNFTs= artifacts.require("EscrowNFTs");
const EscrowERC20= artifacts.require("EscrowERC20");
const EscrowDistributions= artifacts.require("EscrowDistributions");
const ExecutionManager= artifacts.require("ExecutionManager");
const RoyaltyManager= artifacts.require("RoyaltyManager");
const OrderbookManager= artifacts.require("OrderbookManager");
const OrderbookStorage= artifacts.require("OrderbookStorage");
const LibOrder = artifacts.require("LibOrder");


module.exports = async function(deployer, networks, accounts) {

    await deployer.deploy(LibOrder);
    await deployer.link(LibOrder, [OrderbookStorage]);
    await deployer.link(LibOrder, [Exchange]);

    // Todo: Deploy Exchange contracts

    // 1. Deploy Address Registry
    // 2. Deploy Orderbook Storage
    // 3. Deploy EscrowNFT
    // 4. Deploy EscrowERC20 and EscrowDistributions
    //      * Deploy ERC20 first, and then pass the correct pair to the Distributions
    //      * Each EscrowERC20 contract can only hold the correct ERC20 token. Distributions are the same
    // 5. Register the Orderbook Storaeg, EscrowNFTs, EscrowERC20 and EscrowDistributions to the Address Registry
    // 6. Deploy OrderbookManager and pass the address registry
    //      6a. grant OrderbookManager the MANAGER_ROLE in the OrderbookStorage Contract
    // 7. Deploy ExecutionManager and pass the address registry
    //      7a. grant ExecutionManager the MANAGER_ROLE in the EscrowNFTs and EscrowERC20 Contracts
    // 8. Deploy RoyaltiesManager and pass the address registry
    //      8a. grant RoyaltiesManager the MANAGER_ROLE in the EscrowERC20 and EscrowDistributions Contract
    // 9. Deploy the Exchange and pass the ExecutionManager, OrderbookManager, and RoyaltiesManager

};
