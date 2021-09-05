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
const AccessControlManager = artifacts.require("AccessControlManager");
const ContractRegistry = artifacts.require("ContractRegistry");
const TagsManager = artifacts.require("TagsManager");

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

    await deployer.link(Constants, [Content, ContentStorage, ContentManager, AccessControlManager]);
    await deployer.link(Asset, [Content, ContentStorage, ContentManager, AccessControlManager]);
    await deployer.link(Royalties, [Content, ContentStorage, ContentManager]);

    // Deploy the Contracts Registry
    const registry = await deployProxy(ContractRegistry, [], {deployer, initializer: '__ContractRegistry_init'});

    // Deploy the Tags Manager Registry
    const tagsManager = await deployProxy(TagsManager, [registry.address], {deployer, initializer: '__TagsManager_init'});
    await registry.setTagsManager(tagsManager.address, {from: deployerAddress});

    // Deploy ERC1155 Content Contracts
    const accessControlManager = await deployProxy(AccessControlManager, [], {deployer, initializer: '__AccessControlManager_init'});
    const contentStorage = await deployProxy(ContentStorage, [[[deployerWalletAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri"], {deployer, initializer: '__ContentStorage_init'});
    const content = await deployProxy(
        Content,
        [
            "RawrContent",
            "RCONT",
            contentStorage.address,
            accessControlManager.address
        ],
        {deployer, initializer: '__Content_init'});

    // set content as for the subsystems Parent 
    await contentStorage.setParent(content.address, {from: deployerAddress});
    await accessControlManager.setParent(content.address, {from: deployerAddress});

    // Deploy Content Contract Manager
    const contentManager = await deployProxy(
        ContentManager,
        [
            content.address,
            contentStorage.address,
            accessControlManager.address,
            tagsManager.address
        ],
        {deployer, initializer: '__ContentManager_init'});

    await content.transferOwnership(contentManager.address, {from: deployerAddress});
    await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
    await accessControlManager.grantRole(await accessControlManager.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

    // Register the Content Manager
    await registry.registerContentManager(contentManager.address, {from: deployerAddress});

    // give deployerAddress system access
    var approvalPair = [[deployerAddress, true]];
    await contentManager.registerSystem(approvalPair);
    
    // Add Assets
    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 0, []],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 0, []],
        [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 0, []],
        [4, "arweave.net/tx/public-uri-4", "arweave.net/tx/private-uri-4", 0, []],
        [5, "arweave.net/tx/public-uri-5", "arweave.net/tx/private-uri-5", 0, []],
        [6, "arweave.net/tx/public-uri-6", "arweave.net/tx/private-uri-6", 0, []],
        [7, "arweave.net/tx/public-uri-7", "arweave.net/tx/private-uri-7", 0, []],
        [8, "arweave.net/tx/public-uri-8", "arweave.net/tx/private-uri-8", 0, []],
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
    console.log('Systems Registry Deployed: ', accessControlManager.address);
    console.log('Contract Registry Deployed: ', registry.address);
    console.log('Craft Deployed: ', craft.address);
    console.log('Salvage Deployed: ', salvage.address);
};
