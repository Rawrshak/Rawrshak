// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");

module.exports = async function(deployer, networks, accounts) {
    // upgrade the contract.
    const rawrToken = await RawrToken.deployed(); 
    const upgraded = await upgradeProxy(rawrToken.address, RawrToken, {deployer});
    console.log('Deployed Rawrtoken: ', rawrToken.address);
    console.log('Deployed Upgraded Rawr Token: ', upgraded.address);

};