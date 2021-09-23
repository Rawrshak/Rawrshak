// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const { constants } = require('@openzeppelin/test-helpers');

// RAWR Token
const RawrToken = artifacts.require("RawrToken");
const ContentFactory = artifacts.require("ContentFactory");
const ContentManager = artifacts.require("ContentManager");
const Content = artifacts.require("Content");

module.exports = async function(deployer, network, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        developerAddress,           // Developer Address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address,             // Player 3 test address
        player4Address              // Player 4 test address
    ] = accounts;

    if (!['mainnet', 'mainnet-fork', 'goerli'].includes(network)) {
        const rawr = await RawrToken.deployed();

        // transfer 10000 tokens to all player addresses
        await rawr.transfer(player1Address, web3.utils.toWei('10000', 'ether'));
        await rawr.transfer(player2Address, web3.utils.toWei('10000', 'ether'));
        await rawr.transfer(player3Address, web3.utils.toWei('10000', 'ether'));
        await rawr.transfer(player4Address, web3.utils.toWei('10000', 'ether'));

        const factory = await ContentFactory.deployed();
        var result = await factory.createContracts(developerAddress, 5000, "arweave.net/tx-contract-uri", {from: developerAddress});

        var content = await Content.at(result.logs[2].args.content);
        var contentManager = await ContentManager.at(result.logs[2].args.contentManager);

        // Register developer as an operator
        var approvalPair = [[developerAddress, true]];
        await contentManager.registerOperators(approvalPair, {from: developerAddress});

        var asset = [
            [0, "arweave.net/tx/public-uri-1", "", constants.MAX_UINT256, developerAddress, 10000],
            [1, "arweave.net/tx/public-uri-2", "", constants.MAX_UINT256, constants.ZERO_ADDRESS, 0],
            [2, "arweave.net/tx/public-uri-3", "", constants.MAX_UINT256, constants.ZERO_ADDRESS, 0],
            [3, "arweave.net/tx/public-uri-4", "", constants.MAX_UINT256, constants.ZERO_ADDRESS, 0],
            [4, "arweave.net/tx/public-uri-5", "", 100, developerAddress, 20000],
            [5, "arweave.net/tx/public-uri-6", "", 10, developerAddress, 50000]
        ];

        // add assets
        await contentManager.addAssetBatch(asset, {from: developerAddress});
        
        // mint some assets
        var mintData = [developerAddress, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, constants.ZERO_ADDRESS, []];
        await content.mintBatch(mintData, {from: developerAddress});

        await content.safeBatchTransferFrom(developerAddress, player1Address, [0,1,2,3], [10,10,10,10], 0, {from: developerAddress});
        await content.safeBatchTransferFrom(developerAddress, player2Address, [0,1,2,3,4], [10,10,10,10,2], 0, {from: developerAddress});
        await content.safeBatchTransferFrom(developerAddress, player3Address, [0,1,2,3,4], [10,10,10,10,2], 0, {from: developerAddress});
        await content.safeBatchTransferFrom(developerAddress, player4Address, [0,1,2,3,5], [10,10,10,10,1], 0, {from: developerAddress});
    }

    // // Note: TransparentUpgradeProxy is the address we talk to.
};