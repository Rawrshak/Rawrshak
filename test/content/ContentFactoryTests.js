const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Content Clone Factory Tests', () => {
    var deployerAddress, developer1Address, developer2Address;
        
    before(async () => {
        [deployerAddress, developer1Address, developer2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
    });

    beforeEach(async () => {
        accessControlManagerImpl = await AccessControlManager.deploy();
        contentImpl = await Content.deploy();
        contentStorageImpl = await ContentStorage.deploy();
        contentManagerImpl = await ContentManager.deploy();

        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [contentImpl.address, contentManagerImpl.address, contentStorageImpl.address, accessControlManagerImpl.address]);
    });

    describe("Basic Tests", () => {
        it('Properly Initialized Clone Factory', async () => {
            // Check initializer parameters
            expect(await contentFactory.contentImplementation()).to.equal(contentImpl.address);
            expect(await contentFactory.contentManagerImplementation()).to.equal(contentManagerImpl.address);
            expect(await contentFactory.contentStorageImplementation()).to.equal(contentStorageImpl.address);
            expect(await contentFactory.accessControlManagerImplementation()).to.equal(accessControlManagerImpl.address);
        });
    });
    
    describe("Clone Contracts", () => {
        it('Create Content Contracts - Simple', async () => {
            // Check initializer parameters
            var uri = "arweave.net/tx-contract-uri";
    
            // deploy contracts
            var tx = await contentFactory.createContracts(deployerAddress.address, 10000, uri);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            content = Content.attach(deployedContracts[0].args.content);
            contentManager = ContentManager.attach(deployedContracts[0].args.contentManager);

            expect(content.address).not.equal(contentImpl.address);
            expect(contentManager.address).not.equal(contentManagerImpl.address);
    
            expect(await content.contractUri()).is.equal(uri);
            expect(await contentManager.owner()).is.equal(deployerAddress.address);
            
            expect(await contentFactory.contentExists(content.address)).is.equal(true);
            expect(await contentFactory.contentManagerExists(contentManager.address)).is.equal(true);
        });
        
        it('Create Content Contracts from different developers', async () => {
            // Check initializer parameters
            var uri1 = "arweave.net/tx-contract-uri";
            var uri2 = "arweave.net/tx-contract-uri-2";

            // developer 1 launches contracts
            var tx = await contentFactory.connect(developer1Address).createContracts(developer1Address.address, 10000, uri1);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev1Content = Content.attach(deployedContracts[0].args.content);
            dev1ContentManager = ContentManager.attach(deployedContracts[0].args.contentManager);

            // developer 2 launches contracts
            tx = await contentFactory.connect(developer2Address).createContracts(developer2Address.address, 10000, uri2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2Content = Content.attach(deployedContracts[0].args.content);
            dev2ContentManager = ContentManager.attach(deployedContracts[0].args.contentManager);

            // Checks if the addresses are not the same
            expect(dev1Content.address).not.equal(dev2Content.address);
            expect(dev1ContentManager.address).not.equal(dev2ContentManager.address);
            
            // URIs should not be the same
            expect(await dev1Content.contractUri()).not.equal(await dev2Content.contractUri());
        });
    });
});
