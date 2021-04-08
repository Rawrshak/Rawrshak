const RawrshakTokenContract = artifacts.require("RawrToken");
const Utils = artifacts.require("Utils");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

module.exports = async function(deployer, networks, accounts) {
    // deploy RAWR token with 1,000,000,000 initial supply.
    await deployer.deploy(RawrshakTokenContract, web3.utils.toWei('1000000000', 'ether'));

    // Deploy Libraries
    await deployer.deploy(Utils);
    
    // deploy GlobalItemRegistry Contract
    await deployer.deploy(GlobalItemRegistry);
};
