// Upgrade Deployer proxy
const { deployProxy } = require('@openzeppelin/truffle-upgrades');

// Library Contracts
const Constants = artifacts.require("LibConstants");
const Asset = artifacts.require("LibAsset");
const Royalties = artifacts.require("LibRoyalties");

// V2 Implementation
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const ContentManagerRegistry = artifacts.require("ContentManagerRegistry");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    // Deploy Libraries
    await deployer.deploy(Constants);
    await deployer.deploy(Asset);
    await deployer.deploy(Royalties);

    await deployer.link(Constants, [Content, ContentStorage, ContentManager, SystemsRegistry]);
    await deployer.link(Asset, [Content, ContentStorage, ContentManager, SystemsRegistry]);
    await deployer.link(Royalties, [Content, ContentStorage, ContentManager]);

    // Deploy the Content Manager Registry
    const registry = await deployProxy(ContentManagerRegistry, [], {deployer, initializer: '__ContentManagerRegistry_init'});

    // Deploy ERC1155 Content Contracts
    const systemsRegistry = await deployProxy(SystemsRegistry, [], {deployer, initializer: '__SystemsRegistry_init'});
    const contentStorage = await deployProxy(ContentStorage, ["ipfs:/", [[deployerWalletAddress, web3.utils.toWei('0.01', 'ether')]]], {deployer, initializer: '__ContentStorage_init'});
    const content = await deployProxy(
        Content,
        [
            "RawrContent",
            "RCONT",
            "ipfs:/contract-uri",
            contentStorage.address,
            systemsRegistry.address
        ],
        {deployer, initializer: '__Content_init'});

    // set content as for the subsystems Parent 
    await contentStorage.setParent(content.address, {from: deployerAddress});
    await systemsRegistry.setParent(content.address, {from: deployerAddress});

    // Deploy Content Contract Manager
    const contentManager = await deployProxy(
        ContentManager,
        [
            content.address,
            contentStorage.address,
            systemsRegistry.address
        ],
        {deployer, initializer: '__ContentManager_init'});

    await content.transferOwnership(contentManager.address, {from: deployerAddress});
    await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
    await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

    // Register the Content Manager
    await registry.registerContentManager(contentManager.address, {from: deployerAddress});

    console.log('Content Deployed: ', content.address);
    console.log('Content Storage Deployed: ', contentStorage.address);
    console.log('Content Manager Deployed: ', contentManager.address);
    console.log('Systems Registry Deployed: ', systemsRegistry.address);
    console.log('Content Manager Registry Deployed: ', registry.address);
};
