const RawrshakTokenContract = artifacts.require("RawrToken");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        arenaNetAddress,            // Developer wallet address
        blizzardAddress,            // Developer wallet address
        bungieAddress,              // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address,             // Player 3 test address
        player4Address,             // Player 4 test address
        player5Address,             // Player 5 test address
        player6Address              // Player 6 test address
    ] = accounts;

    // get RAWR token with 1,000,000,000 initial supply and distribute them
    rawrshakTokenContract = await RawrshakTokenContract.deployed();
    await rawrshakTokenContract.approve(deployerAddress, web3.utils.toWei('1000000000', 'gwei'), {from:deployerAddress}); // in wei
    await rawrshakTokenContract.transfer(player1Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});
    await rawrshakTokenContract.transfer(player2Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});
    await rawrshakTokenContract.transfer(player3Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});
    await rawrshakTokenContract.transfer(player4Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});
    await rawrshakTokenContract.transfer(player5Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});
    await rawrshakTokenContract.transfer(player6Address, web3.utils.toWei('100000', 'gwei'), {from:deployerAddress});  
};
