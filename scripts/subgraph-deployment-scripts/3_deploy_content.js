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

    console.log('Content Deployed: ', content.address);
    console.log('Content Storage Deployed: ', contentStorage.address);
    console.log('Content Manager Deployed: ', contentManager.address);
    console.log('Systems Registry Deployed: ', accessControlManager.address);
    console.log('Content Manager Registry Deployed: ', registry.address);
};
