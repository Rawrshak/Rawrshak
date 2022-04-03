const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Collection Clone Factory Tests', () => {
    var deployerAddress, developer1Address, developer2Address;
        
    before(async () => {
        [deployerAddress, developer1Address, developer2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        CollectionStorage = await ethers.getContractFactory("CollectionStorage");
        Collection = await ethers.getContractFactory("Collection");
        CollectionManager = await ethers.getContractFactory("CollectionManager");
        CollectionFactory = await ethers.getContractFactory("CollectionFactory");
    });

    beforeEach(async () => {
        accessControlManagerImpl = await AccessControlManager.deploy();
        collectionImpl = await Collection.deploy();
        collectionStorageImpl = await CollectionStorage.deploy();
        collectionManagerImpl = await CollectionManager.deploy();

        // Initialize Clone Factory
        collectionFactory = await upgrades.deployProxy(CollectionFactory, [collectionImpl.address, collectionManagerImpl.address, collectionStorageImpl.address, accessControlManagerImpl.address]);
    });

    describe("Basic Tests", () => {
        it('Properly Initialized Clone Factory', async () => {
            // Check initializer parameters
            expect(await collectionFactory.collectionImplementation()).to.equal(collectionImpl.address);
            expect(await collectionFactory.collectionManagerImplementation()).to.equal(collectionManagerImpl.address);
            expect(await collectionFactory.collectionStorageImplementation()).to.equal(collectionStorageImpl.address);
            expect(await collectionFactory.accessControlManagerImplementation()).to.equal(accessControlManagerImpl.address);
        });
    });
    
    describe("Clone Contracts", () => {
        it('Create Collection Contracts - Simple', async () => {
            // Check initializer parameters
            var uri = "arweave.net/tx-contract-uri";
    
            // deploy contracts
            var tx = await collectionFactory.createContracts(deployerAddress.address, 10000, uri);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            collection = await Collection.attach(deployedContracts[0].args.collection);
            collectionManager = await CollectionManager.attach(deployedContracts[0].args.collectionManager);

            expect(collection.address).not.equal(collectionImpl.address);
            expect(collectionManager.address).not.equal(collectionManagerImpl.address);
    
            expect(await collection.contractUri()).is.equal(uri);
            expect(await collectionManager.owner()).is.equal(deployerAddress.address);
            
            expect(await collectionFactory.collectionExists(collection.address)).is.equal(true);
            expect(await collectionFactory.collectionManagerExists(collectionManager.address)).is.equal(true);

            // check if the developer wallet can mint
            expect(await collectionManager.isMinter(deployerAddress.address)).is.equal(true);
        });
        
        it('Create Collection Contracts from different developers', async () => {
            // Check initializer parameters
            var uri1 = "arweave.net/tx-contract-uri";
            var uri2 = "arweave.net/tx-contract-uri-2";

            // developer 1 launches contracts
            var tx = await collectionFactory.connect(developer1Address).createContracts(developer1Address.address, 10000, uri1);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev1Collection = await Collection.attach(deployedContracts[0].args.collection);
            dev1CollectionManager = await CollectionManager.attach(deployedContracts[0].args.collectionManager);

            // developer 2 launches contracts
            tx = await collectionFactory.connect(developer2Address).createContracts(developer2Address.address, 10000, uri2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2Collection = await Collection.attach(deployedContracts[0].args.collection);
            dev2CollectionManager = await CollectionManager.attach(deployedContracts[0].args.collectionManager);

            // Checks if the addresses are not the same
            expect(dev1Collection.address).not.equal(dev2Collection.address);
            expect(dev1CollectionManager.address).not.equal(dev2CollectionManager.address);
            
            // URIs should not be the same
            expect(await dev1Collection.contractUri()).not.equal(await dev2Collection.contractUri());
        });

        it('Invalid Create Contract parameters', async () => {
            // Check initializer parameters
            var uri1 = "arweave.net/tx-contract-uri";

            await expect(collectionFactory.connect(developer1Address).createContracts(developer1Address.address, 1500000, uri1))
                .to.be.reverted;
            await expect(collectionFactory.connect(developer1Address).createContracts(null, 10000, uri1))
                .to.be.reverted;
            await expect(collectionFactory.connect(developer1Address).createContracts(ethers.constants.AddressZero, 20000, uri1))
                .to.be.reverted;
        });
    });

    describe("Update Contracts tests", () => {
        it('Update Contracts', async () => {
            expect(await collectionFactory.collectionImplementation()).to.equal(collectionImpl.address);
            expect(await collectionFactory.collectionManagerImplementation()).to.equal(collectionManagerImpl.address);
            expect(await collectionFactory.collectionStorageImplementation()).to.equal(collectionStorageImpl.address);
            expect(await collectionFactory.accessControlManagerImplementation()).to.equal(accessControlManagerImpl.address);
            // when CollectionFactory is initialized it uses updateContracts() which increments the contractVersion to 1
            expect(await collectionFactory.contractVersion()).to.equal(1);

            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newCollectionImpl = await Collection.deploy();
            newCollectionStorageImpl = await CollectionStorage.deploy();
            newCollectionManagerImpl = await CollectionManager.deploy();

            // update contract implementations with the new versions
            await collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, newCollectionManagerImpl.address, newCollectionStorageImpl.address, newAccessControlManagerImpl.address);

            // checks that the contract implementations do not equal the old versions
            expect(await collectionFactory.collectionImplementation()).not.equal(collectionImpl.address);
            expect(await collectionFactory.collectionManagerImplementation()).not.equal(collectionManagerImpl.address);
            expect(await collectionFactory.collectionStorageImplementation()).not.equal(collectionStorageImpl.address);
            expect(await collectionFactory.accessControlManagerImplementation()).not.equal(accessControlManagerImpl.address);

            // checks that the contract implementations equal the new versions
            expect(await collectionFactory.collectionImplementation()).to.equal(newCollectionImpl.address);
            expect(await collectionFactory.collectionManagerImplementation()).to.equal(newCollectionManagerImpl.address);
            expect(await collectionFactory.collectionStorageImplementation()).to.equal(newCollectionStorageImpl.address);
            expect(await collectionFactory.accessControlManagerImplementation()).to.equal(newAccessControlManagerImpl.address);

            expect(await collectionFactory.contractVersion()).to.equal(2);
        });

        it('Invalid parameters', async () => {
            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newCollectionImpl = await Collection.deploy();
            newCollectionStorageImpl = await CollectionStorage.deploy();
            newCollectionManagerImpl = await CollectionManager.deploy();

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl, newCollectionManagerImpl, newCollectionStorageImpl, newAccessControlManagerImpl)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts("", newCollectionManagerImpl, "", newAccessControlManagerImpl)).to.be.reverted;

            // Checks for Address Zero
            await expect(collectionFactory.connect(deployerAddress).updateContracts(ethers.constants.AddressZero, newCollectionManagerImpl.address, newCollectionStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, ethers.constants.AddressZero, newCollectionStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, newCollectionManagerImpl.address, ethers.constants.AddressZero, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, newCollectionManagerImpl.address, newCollectionStorageImpl.address, ethers.constants.AddressZero)).to.be.reverted;
        });

        it('Null parameters', async () => {
            // new versions of the contracts         
            newAccessControlManagerImpl = await AccessControlManager.deploy();
            newCollectionImpl = await Collection.deploy();
            newCollectionStorageImpl = await CollectionStorage.deploy();
            newCollectionManagerImpl = await CollectionManager.deploy();

            await expect(collectionFactory.connect(deployerAddress).updateContracts(null, newCollectionManagerImpl.address, newCollectionStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, null, newCollectionStorageImpl.address, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, newCollectionManagerImpl.address, null, newAccessControlManagerImpl.address)).to.be.reverted;

            await expect(collectionFactory.connect(deployerAddress).updateContracts(newCollectionImpl.address, newCollectionManagerImpl.address, newCollectionStorageImpl.address, null)).to.be.reverted;
        });
    });
});
