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
            content = await Content.attach(deployedContracts[0].args.content);
            contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

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
            dev1Content = await Content.attach(deployedContracts[0].args.content);
            dev1ContentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

            // developer 2 launches contracts
            tx = await contentFactory.connect(developer2Address).createContracts(developer2Address.address, 10000, uri2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2Content = await Content.attach(deployedContracts[0].args.content);
            dev2ContentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

            // Checks if the addresses are not the same
            expect(dev1Content.address).not.equal(dev2Content.address);
            expect(dev1ContentManager.address).not.equal(dev2ContentManager.address);
            
            // URIs should not be the same
            expect(await dev1Content.contractUri()).not.equal(await dev2Content.contractUri());
        });

        it('Invalid Create Contract parameters', async () => {
            // Check initializer parameters
            var uri1 = "arweave.net/tx-contract-uri";

            await expect(contentFactory.connect(developer1Address).createContracts(developer1Address.address, 1500000, uri1))
                .to.be.reverted;
            await expect(contentFactory.connect(developer1Address).createContracts(null, 10000, uri1))
                .to.be.reverted;
            await expect(contentFactory.connect(developer1Address).createContracts(ethers.constants.AddressZero, 20000, uri1))
                .to.be.reverted;
        });
    });

    describe("Update Contracts tests", () => {
        it('Update Contracts', async () => {
            expect(await contentFactory.contentImplementation()).to.equal(contentImpl.address);
            expect(await contentFactory.contentManagerImplementation()).to.equal(contentManagerImpl.address);
            expect(await contentFactory.contentStorageImplementation()).to.equal(contentStorageImpl.address);
            expect(await contentFactory.accessControlManagerImplementation()).to.equal(accessControlManagerImpl.address);
            // when ContentFactory is initialized it uses updateContracts() which increments the contractVersion to 1
            expect(await contentFactory.contractVersion()).to.equal(1);

            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newContentImpl = await Content.deploy();
            newContentStorageImpl = await ContentStorage.deploy();
            newContentManagerImpl = await ContentManager.deploy();

            // update contract implementations with the new versions
            await contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, newContentManagerImpl.address, newContentStorageImpl.address, newAccessControlManagerImpl.address);

            // checks that the contract implementations do not equal the old versions
            expect(await contentFactory.contentImplementation()).not.equal(contentImpl.address);
            expect(await contentFactory.contentManagerImplementation()).not.equal(contentManagerImpl.address);
            expect(await contentFactory.contentStorageImplementation()).not.equal(contentStorageImpl.address);
            expect(await contentFactory.accessControlManagerImplementation()).not.equal(accessControlManagerImpl.address);

            // checks that the contract implementations equal the new versions
            expect(await contentFactory.contentImplementation()).to.equal(newContentImpl.address);
            expect(await contentFactory.contentManagerImplementation()).to.equal(newContentManagerImpl.address);
            expect(await contentFactory.contentStorageImplementation()).to.equal(newContentStorageImpl.address);
            expect(await contentFactory.accessControlManagerImplementation()).to.equal(newAccessControlManagerImpl.address);

            expect(await contentFactory.contractVersion()).to.equal(2);
        });

        it('Invalid parameters', async () => {
            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newContentImpl = await Content.deploy();
            newContentStorageImpl = await ContentStorage.deploy();
            newContentManagerImpl = await ContentManager.deploy();

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl, newContentManagerImpl, newContentStorageImpl, newAccessControlManagerImpl)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts("", newContentManagerImpl, "", newAccessControlManagerImpl)).to.be.reverted;

            // Checks for Address Zero
            await expect(contentFactory.connect(deployerAddress).updateContracts(ethers.constants.AddressZero, newContentManagerImpl.address, newContentStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, ethers.constants.AddressZero, newContentStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, newContentManagerImpl.address, ethers.constants.AddressZero, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, newContentManagerImpl.address, newContentStorageImpl.address, ethers.constants.AddressZero)).to.be.reverted;
        });

        it('Null parameters', async () => {
            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newContentImpl = await Content.deploy();
            newContentStorageImpl = await ContentStorage.deploy();
            newContentManagerImpl = await ContentManager.deploy();

            await expect(contentFactory.connect(deployerAddress).updateContracts(null, newContentManagerImpl.address, newContentStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, null, newContentStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, newContentManagerImpl.address, null, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(contentFactory.connect(deployerAddress).updateContracts(newContentImpl.address, newContentManagerImpl.address, newContentStorageImpl.address, null)).to.be.reverted;
        });
    });
});
