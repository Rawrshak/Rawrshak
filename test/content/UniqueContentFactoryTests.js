const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Unique Content Clone Factory Tests', () => {
    var deployerAddress, developer1Address, developer2Address;
        
    before(async () => {
        [deployerAddress, developer1Address, developer2Address] = await ethers.getSigners();
        UniqueContentStorage = await ethers.getContractFactory("UniqueContentStorage");
        UniqueContent = await ethers.getContractFactory("UniqueContent");
        UniqueContentFactory = await ethers.getContractFactory("UniqueContentFactory");
    });

    beforeEach(async () => {
        uniqueContentImpl = await UniqueContent.deploy();
        uniqueContentStorageImpl = await UniqueContentStorage.deploy();

        // Initialize Clone Factory
        uniqueContentFactory = await upgrades.deployProxy(UniqueContentFactory, [uniqueContentImpl.address, uniqueContentStorageImpl.address]);
    });

    describe("Basic Tests", () => {
        it('Properly Initialized Clone Factory', async () => {
            // Check initializer parameters
            expect(await uniqueContentFactory.uniqueContentImplementation()).to.equal(uniqueContentImpl.address);
            expect(await uniqueContentFactory.uniqueContentStorageImplementation()).to.equal(uniqueContentStorageImpl.address);
        });
    });
    
    describe("Clone Contracts", () => {
        it('Create Unique Content Contracts - Simple', async () => {
            // Check initializer parameters
            var name = "Vincent Van Goth";
            var symbol = "VVG"
    
            // deploy contracts
            var tx = await uniqueContentFactory.createContracts(name, symbol);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractsDeployed event
            uniqueContent = await UniqueContent.attach(deployedContracts[0].args.uniqueContent);

            expect(uniqueContent.address).not.equal(uniqueContentImpl.address);
    
            expect(await uniqueContent.name()).is.equal(name);
            expect(await uniqueContent.symbol()).is.equal(symbol);
            
            expect(await uniqueContentFactory.contentExists(uniqueContent.address)).is.equal(true);
        });
        
        it('Create Content Contracts from different developers', async () => {
            // Check initializer parameters
            var name1 = "Leonardo The Vinci";
            var symbol1 = "LTV";
            var name2 = "Bank See"
            var symbol2 = "BS";

            // developer 1 launches contracts
            var tx = await uniqueContentFactory.connect(developer1Address).createContracts(name1, symbol1);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractDeployed event
            dev1UniqueContent = await UniqueContent.attach(deployedContracts[0].args.uniqueContent);

            // developer 2 launches contracts
            tx = await uniqueContentFactory.connect(developer2Address).createContracts(name2, symbol2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2UniqueContent = await UniqueContent.attach(deployedContracts[0].args.uniqueContent);

            // Checks if the addresses are not the same
            expect(dev1UniqueContent.address).not.equal(dev2UniqueContent.address);
            
            // names and symbols should not be the same
            expect(await dev1UniqueContent.name()).not.equal(await dev2UniqueContent.name());
            expect(await dev1UniqueContent.symbol()).not.equal(await dev2UniqueContent.symbol());
        });

        it('Invalid Create Contract parameters', async () => {
            // Check initializer parameters
            var name1 = "Ragnarok Pets";
            var symbol1 = "RP"

            await expect(uniqueContentFactory.connect(developer1Address).createContracts(name1))
                .to.be.reverted;
            await expect(uniqueContentFactory.connect(developer1Address).createContracts(developer1Address, name1 , symbol1))
                .to.be.reverted;
            await expect(uniqueContentFactory.connect(developer1Address).createContracts())
                .to.be.reverted;
        });
    });

    describe("Update Contracts tests", () => {
        it('Update Contracts', async () => {
            expect(await uniqueContentFactory.uniqueContentImplementation()).to.equal(uniqueContentImpl.address);
            expect(await uniqueContentFactory.uniqueContentStorageImplementation()).to.equal(uniqueContentStorageImpl.address);
            // when uniqueContentFactory is initialized it uses updateContracts() which increments the contractVersion to 1
            expect(await uniqueContentFactory.contractVersion()).to.equal(1);

            // new versions of the contracts         
            newUniqueContentImpl = await UniqueContent.deploy();
            newUniqueContentStorageImpl = await UniqueContentStorage.deploy();

            // update contract implementations with the new versions
            await uniqueContentFactory.connect(deployerAddress).updateContracts(newUniqueContentImpl.address, newUniqueContentStorageImpl.address);

            // checks that the contract implementations do not equal the old versions
            expect(await uniqueContentFactory.uniqueContentImplementation()).not.equal(uniqueContentImpl.address);
            expect(await uniqueContentFactory.uniqueContentStorageImplementation()).not.equal(uniqueContentStorageImpl.address);

            // checks that the contract implementations equal the new versions
            expect(await uniqueContentFactory.uniqueContentImplementation()).to.equal(newUniqueContentImpl.address);
            expect(await uniqueContentFactory.uniqueContentStorageImplementation()).to.equal(newUniqueContentStorageImpl.address);

            expect(await uniqueContentFactory.contractVersion()).to.equal(2);
        });

        it('Invalid Update Contracts', async () => {
            // new versions of the contracts         
            newUniqueContentImpl = await UniqueContent.deploy();
            newUniqueContentStorageImpl = await UniqueContentStorage.deploy();

            // caller is not the owner
            await expect(uniqueContentFactory.connect(developer1Address).updateContracts(newUniqueContentImpl.address, newUniqueContentStorageImpl.address)).to.be.reverted;

            // invalid parameters
            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts(newUniqueContentImpl, newUniqueContentStorageImpl)).to.be.reverted;
            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts("", newUniqueContentStorageImpl.address)).to.be.reverted;

            // Checks for Address Zero
            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts(ethers.constants.AddressZero, newUniqueContentStorageImpl.address)).to.be.reverted;
            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts(newUniqueContentImpl.address, ethers.constants.AddressZero)).to.be.reverted;
        });

        it('Null parameters', async () => {
            // new versions of the contracts         
            newUniqueContentImpl = await UniqueContent.deploy();
            newUniqueContentStorageImpl = await UniqueContentStorage.deploy();

            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts(null, newUniqueContentStorageImpl.address)).to.be.reverted;
            await expect(uniqueContentFactory.connect(deployerAddress).updateContracts(newUniqueContentImpl.address, null)).to.be.reverted;
        });
    });
});