// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrshakTokenContract = artifacts.require("RawrToken");

module.exports = async function(deployer, networks, accounts) {
    // upgrade the contract.
    const rawrToken = await RawrshakTokenContract.deployed(); 
    const upgraded = await upgradeProxy(rawrToken.address, RawrshakTokenContract, {deployer});
    console.log('Deployed Rawrtoken: ', rawrToken.address);
    console.log('Deployed Upgraded Rawr Token: ', upgraded.address);

};