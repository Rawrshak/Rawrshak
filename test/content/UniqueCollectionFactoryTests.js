const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Unique Collection Clone Factory Tests', () => {
    var deployerAddress, developer1Address, developer2Address;
        
    before(async () => {
        [deployerAddress, developer1Address, developer2Address] = await ethers.getSigners();
        UniqueCollectionStorage = await ethers.getContractFactory("UniqueCollectionStorage");
        UniqueCollection = await ethers.getContractFactory("UniqueCollection");
        UniqueCollectionFactory = await ethers.getContractFactory("UniqueCollectionFactory");
    });

    beforeEach(async () => {
        uniqueCollectionImpl = await UniqueCollection.deploy();
        uniqueCollectionStorageImpl = await UniqueCollectionStorage.deploy();

        // Initialize Clone Factory
        uniqueCollectionFactory = await upgrades.deployProxy(UniqueCollectionFactory, [uniqueCollectionImpl.address, uniqueCollectionStorageImpl.address]);
    });

    describe("Basic Tests", () => {
        it('Properly Initialized Clone Factory', async () => {
            // Check initializer parameters
            expect(await uniqueCollectionFactory.uniqueCollectionImplementation()).to.equal(uniqueCollectionImpl.address);
            expect(await uniqueCollectionFactory.uniqueCollectionStorageImplementation()).to.equal(uniqueCollectionStorageImpl.address);
        });
    });
    
    describe("Clone Contracts", () => {
        it('Create Unique Collection Contracts - Simple', async () => {
            // Check initializer parameters
            var name = "Vincent Van Goth";
            var symbol = "VVG"
    
            // deploy contracts
            var tx = await uniqueCollectionFactory.createContracts(name, symbol);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractsDeployed event
            uniqueCollection = await UniqueCollection.attach(deployedContracts[0].args.uniqueCollection);

            expect(uniqueCollection.address).not.equal(uniqueCollectionImpl.address);
    
            expect(await uniqueCollection.name()).is.equal(name);
            expect(await uniqueCollection.symbol()).is.equal(symbol);
            
            expect(await uniqueCollectionFactory.collectionExists(uniqueCollection.address)).is.equal(true);
        });
        
        it('Create Collection Contracts from different developers', async () => {
            // Check initializer parameters
            var name1 = "Leonardo The Vinci";
            var symbol1 = "LTV";
            var name2 = "Bank See"
            var symbol2 = "BS";

            // developer 1 launches contracts
            var tx = await uniqueCollectionFactory.connect(developer1Address).createContracts(name1, symbol1);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractDeployed event
            dev1UniqueCollection = await UniqueCollection.attach(deployedContracts[0].args.uniqueCollection);

            // developer 2 launches contracts
            tx = await uniqueCollectionFactory.connect(developer2Address).createContracts(name2, symbol2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2UniqueCollection = await UniqueCollection.attach(deployedContracts[0].args.uniqueCollection);

            // Checks if the addresses are not the same
            expect(dev1UniqueCollection.address).not.equal(dev2UniqueCollection.address);
            
            // names and symbols should not be the same
            expect(await dev1UniqueCollection.name()).not.equal(await dev2UniqueCollection.name());
            expect(await dev1UniqueCollection.symbol()).not.equal(await dev2UniqueCollection.symbol());
        });

        it('Invalid Create Contract parameters', async () => {
            // Check initializer parameters
            var name1 = "Ragnarok Pets";
            var symbol1 = "RP"

            await expect(uniqueCollectionFactory.connect(developer1Address).createContracts(name1))
                .to.be.reverted;
            await expect(uniqueCollectionFactory.connect(developer1Address).createContracts(developer1Address, name1 , symbol1))
                .to.be.reverted;
            await expect(uniqueCollectionFactory.connect(developer1Address).createContracts())
                .to.be.reverted;
        });
    });

    describe("Update Contracts tests", () => {
        it('Update Contracts', async () => {
            expect(await uniqueCollectionFactory.uniqueCollectionImplementation()).to.equal(uniqueCollectionImpl.address);
            expect(await uniqueCollectionFactory.uniqueCollectionStorageImplementation()).to.equal(uniqueCollectionStorageImpl.address);
            // when uniqueCollectionFactory is initialized it uses updateContracts() which increments the contractVersion to 1
            expect(await uniqueCollectionFactory.contractVersion()).to.equal(1);

            // new versions of the contracts         
            newUniqueCollectionImpl = await UniqueCollection.deploy();
            newUniqueCollectionStorageImpl = await UniqueCollectionStorage.deploy();

            // update contract implementations with the new versions
            await uniqueCollectionFactory.connect(deployerAddress).updateContracts(newUniqueCollectionImpl.address, newUniqueCollectionStorageImpl.address);

            // checks that the contract implementations do not equal the old versions
            expect(await uniqueCollectionFactory.uniqueCollectionImplementation()).not.equal(uniqueCollectionImpl.address);
            expect(await uniqueCollectionFactory.uniqueCollectionStorageImplementation()).not.equal(uniqueCollectionStorageImpl.address);

            // checks that the contract implementations equal the new versions
            expect(await uniqueCollectionFactory.uniqueCollectionImplementation()).to.equal(newUniqueCollectionImpl.address);
            expect(await uniqueCollectionFactory.uniqueCollectionStorageImplementation()).to.equal(newUniqueCollectionStorageImpl.address);

            expect(await uniqueCollectionFactory.contractVersion()).to.equal(2);
        });

        it('Invalid Update Contracts', async () => {
            // new versions of the contracts         
            newUniqueCollectionImpl = await UniqueCollection.deploy();
            newUniqueCollectionStorageImpl = await UniqueCollectionStorage.deploy();

            // caller is not the owner
            await expect(uniqueCollectionFactory.connect(developer1Address).updateContracts(newUniqueCollectionImpl.address, newUniqueCollectionStorageImpl.address)).to.be.reverted;

            // invalid parameters
            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts(newUniqueCollectionImpl, newUniqueCollectionStorageImpl)).to.be.reverted;
            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts("", newUniqueCollectionStorageImpl.address)).to.be.reverted;

            // Checks for Address Zero
            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts(ethers.constants.AddressZero, newUniqueCollectionStorageImpl.address)).to.be.reverted;
            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts(newUniqueCollectionImpl.address, ethers.constants.AddressZero)).to.be.reverted;
        });

        it('Null parameters', async () => {
            // new versions of the contracts         
            newUniqueCollectionImpl = await UniqueCollection.deploy();
            newUniqueCollectionStorageImpl = await UniqueCollectionStorage.deploy();

            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts(null, newUniqueCollectionStorageImpl.address)).to.be.reverted;
            await expect(uniqueCollectionFactory.connect(deployerAddress).updateContracts(newUniqueCollectionImpl.address, null)).to.be.reverted;
        });
    });
});