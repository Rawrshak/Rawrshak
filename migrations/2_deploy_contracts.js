const RawrshakTokenContract = artifacts.require("RawrToken");
const Utils = artifacts.require("Utils");

// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// V2 Implementation
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    // deploy RAWR token with 1,000,000,000 initial supply.
    await deployer.deploy(RawrshakTokenContract, web3.utils.toWei('1000000000', 'ether'));

    // Deploy Libraries
    await deployer.deploy(Utils);

    // Deploy ERC1155 Content Contracts
    const contentStorage = await deployProxy(ContentStorage, ["ipfs:/", []], {deployer});
    const content = await deployProxy(Content, ["RawrContent", "RCONT", "ipfs:/test", contentStorage.address], {deployer});
    
    // set content as contentStorage Parent 
    await contentStorage.setParent(content, {from: deployerAddress})

    // Deploy Content Contract Manager
    const contentManager = await deployProxy(ContentManager, [content.address, contentStorage.address], {deployer});
    await content.transferOwnership(contentManager, {from: deployerAddress});
    await contentStorage.grantRole(await ContentStorage.OWNER_ROLE(), contentManager, {from: deployerAddress});

    console.log('Content Deployed', content.address);
    console.log('Content Storage Deployed', contentStorage.address);
    console.log('Content Manager Deployed', contentManager.address);
};
