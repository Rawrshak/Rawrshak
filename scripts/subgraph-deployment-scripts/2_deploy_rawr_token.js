// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// RAWR Token
const RawrshakTokenContract = artifacts.require("RawrToken");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    // deploy RAWR token with 1,000,000,000 initial supply.
    const rawrToken = await deployProxy(RawrshakTokenContract, [ web3.utils.toWei('1000000000', 'ether') ], {deployer, initializer: '__RawrToken_init'});
    console.log('Deployed', rawrToken.address);

    await rawrToken.transfer(player1Address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
    await rawrToken.transfer(player2Address, web3.utils.toWei('2000', 'ether'), {from: deployerAddress});
    await rawrToken.transfer(player3Address, web3.utils.toWei('500000', 'ether'), {from: deployerAddress});

    // Note: TransparentUpgradeProxy is the address we talk to.
};