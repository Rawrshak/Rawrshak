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
const ContractRegistry = artifacts.require("ContractRegistry");

const Craft = artifacts.require("Craft");
const Salvage = artifacts.require("Salvage");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
    ] = accounts;

    // Deploy Libraries
    await deployer.deploy(Constants);
    await deployer.deploy(Asset);
    await deployer.deploy(Royalties);

    await deployer.link(Constants, [Content, ContentStorage, ContentManager, SystemsRegistry]);
    await deployer.link(Asset, [Content, ContentStorage, ContentManager, SystemsRegistry]);
    await deployer.link(Royalties, [Content, ContentStorage, ContentManager]);

    // Deploy the Content Manager Registry
    const registry = await deployProxy(ContractRegistry, [], {deployer, initializer: '__ContractRegistry_init'});

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

    // give deployerAddress system access
    var approvalPair = [[deployerAddress, true]];
    await contentManager.registerSystem(approvalPair);
    
    // Add Assets
    var asset = [
        [1, "ipfs:/CID-1", 0, []],
        [2, "ipfs:/CID-2", 0, []],
        [3, "ipfs:/CID-3", 0, []],
        [4, "ipfs:/CID-4", 0, []],
        [5, "ipfs:/CID-5", 0, []],
        [6, "ipfs:/CID-6", 0, []],
        [7, "ipfs:/CID-7", 0, []],
        [8, "ipfs:/CID-8", 0, []],
    ];
    await contentManager.addAssetBatch(asset);

    // Set up Craft and Salvage Contracts
    const craft = await deployProxy(Craft, [1000], {deployer, initializer: '__Craft_init'});
    const salvage = await deployProxy(Salvage, [1000], {deployer, initializer: '__Salvage_init'});
    
    // Register the craft and salvage as a system on the content contract
    var approvalPairs = [[craft.address, true], [salvage.address, true]];
    await contentManager.registerSystem(approvalPairs, {from: deployerAddress});

    // registered manager
    await craft.registerManager(deployerAddress, {from: deployerAddress});
    await salvage.registerManager(deployerAddress, {from: deployerAddress});
    
    // register contracts
    await registry.registerCraft(craft.address, {from: deployerAddress});
    await registry.registerSalvage(salvage.address, {from: deployerAddress});
    
    // Register the content contract
    await craft.registerContent(await contentManager.content(), {from: deployerAddress});
    await salvage.registerContent(await contentManager.content(), {from: deployerAddress});
    
    console.log('Content Deployed: ', content.address);
    console.log('Content Storage Deployed: ', contentStorage.address);
    console.log('Content Manager Deployed: ', contentManager.address);
    console.log('Systems Registry Deployed: ', systemsRegistry.address);
    console.log('Contract Registry Deployed: ', registry.address);
    console.log('Craft Deployed: ', craft.address);
    console.log('Salvage Deployed: ', salvage.address);
};
