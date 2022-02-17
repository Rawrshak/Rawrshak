const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Crafting Base Tests', () => {
    var manager;
    var deployerAddress, deployerAltAddress, minterAddress, playerAddress;
    var contentFactory;
    var contentManager;
    var contentStorage;
    var AccessControlManager, ContentManager, ContentStorage, Content, TestCraftBase;
    
    // NFT
    var craftBase;
    var manager_role;

    before(async () => {
        [deployerAddress, deployerAltAddress, minterAddress, playerAddress] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        TestCraftBase = await ethers.getContractFactory("TestCraftBase");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
    });

    beforeEach(async () => {
        manager = await upgrades.deployProxy(AccessControlManager, []);
    });

    beforeEach(async () => {
        // Set up NFT Contract
        contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
        var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
        craftBase = await upgrades.deployProxy(TestCraftBase, [1000]);
        manager_role = await craftBase.MANAGER_ROLE();

        accessControlManagerImpl = await AccessControlManager.deploy();
        contentImpl = await Content.deploy();
        contentStorageImpl = await ContentStorage.deploy();
        contentManagerImpl = await ContentManager.deploy();

        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [contentImpl.address, contentManagerImpl.address, contentStorageImpl.address, accessControlManagerImpl.address]);

        // deploy contracts
        var tx =  await contentFactory.createContracts(deployerAddress.address, 10000, "arweave.net/tx-contract-uri");
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

        await contentStorage.setParent(content.address);

        // Setup content manager
        await manager.grantRole(await manager.DEFAULT_ADMIN_ROLE(), contentManager.address);
        await manager.setParent(content.address);
        
        // Register the craftbase as a system on the content contract
        var approvalPair = [[craftBase.address, true]];
        await contentManager.registerOperators(approvalPair);

        // registered manager
        await craftBase.registerManager(contentManager.address);
    });

    it('Check if CraftBase Test Contract was deployed properly', async () => {
        expect(craftBase.address != 0x0, "CraftBase Test Contract was not deployed properly.").to.equal(true);
    });

    it('Register Manager and check permissions', async () => {
        var results = await craftBase.registerManager(contentManager.address);
    
        await expect(results)
            .to.emit(craftBase, 'ManagerRegistered');

        // manager address should have the manager role
        expect(await craftBase.hasRole(manager_role, contentManager.address), "manager address should have the manager role").to.equal(true);

        // deployer address should not have the manager role
        expect(await craftBase.hasRole(manager_role, deployerAddress.address), "deployer address should not have the manager role").to.equal(false);
    });

    it('Pause and unpause the contract', async () => {
        await craftBase.registerManager(deployerAddress.address);

        await craftBase.managerSetPause(false);

        // Craft Base contract should be not be paused.
        expect(await craftBase.paused(), "Craft Base contract should be not be paused.").to.equal(false);

        await craftBase.managerSetPause(true);
    
        // Craft Base contract should be paused.
        expect(await craftBase.paused(), "Craft Base contract should be paused.").to.equal(true);
    });

});
