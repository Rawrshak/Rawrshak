const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Unique Collection Clone Factory Tests', () => {
    var deployerAddress, developer1Address, developer2Address;
        
    before(async () => {
        [deployerAddress, developer1Address, developer2Address] = await ethers.getSigners();
        PersonalizedAssetsStorage = await ethers.getContractFactory("PersonalizedAssetsStorage");
        PersonalizedAssets = await ethers.getContractFactory("PersonalizedAssets");
        PersonalizedAssetsFactory = await ethers.getContractFactory("PersonalizedAssetsFactory");
    });

    beforeEach(async () => {
        personalizedAssetsImpl = await PersonalizedAssets.deploy();
        personalizedAssetsStorageImpl = await PersonalizedAssetsStorage.deploy();

        // Initialize Clone Factory
        personalizedAssetsFactory = await upgrades.deployProxy(PersonalizedAssetsFactory, [personalizedAssetsImpl.address, personalizedAssetsStorageImpl.address]);
    });

    describe("Basic Tests", () => {
        it('Properly Initialized Clone Factory', async () => {
            // Check initializer parameters
            expect(await personalizedAssetsFactory.personalizedAssetsImplementation()).to.equal(personalizedAssetsImpl.address);
            expect(await personalizedAssetsFactory.personalizedAssetsStorageImplementation()).to.equal(personalizedAssetsStorageImpl.address);
        });
    });
    
    describe("Clone Contracts", () => {
        it('Create Unique Collection Contracts - Simple', async () => {
            // Check initializer parameters
            var name = "Vincent Van Goth";
            var symbol = "VVG"
    
            // deploy contracts
            var tx = await personalizedAssetsFactory.createContracts(name, symbol);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractsDeployed event
            personalizedAssets = await PersonalizedAssets.attach(deployedContracts[0].args.personalizedAssets);

            expect(personalizedAssets.address).not.equal(personalizedAssetsImpl.address);
    
            expect(await personalizedAssets.name()).is.equal(name);
            expect(await personalizedAssets.symbol()).is.equal(symbol);
            
            expect(await personalizedAssetsFactory.collectionExists(personalizedAssets.address)).is.equal(true);
        });
        
        it('Create Collection Contracts from different developers', async () => {
            // Check initializer parameters
            var name1 = "Leonardo The Vinci";
            var symbol1 = "LTV";
            var name2 = "Bank See"
            var symbol2 = "BS";

            // developer 1 launches contracts
            var tx = await personalizedAssetsFactory.connect(developer1Address).createContracts(name1, symbol1);
            var receipt = await tx.wait();
            var deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the UniqueContractDeployed event
            dev1PersonalizedAssets = await PersonalizedAssets.attach(deployedContracts[0].args.personalizedAssets);

            // developer 2 launches contracts
            tx = await personalizedAssetsFactory.connect(developer2Address).createContracts(name2, symbol2);
            receipt = await tx.wait();
            deployedContracts = receipt.events?.filter((x) => {return x.event == "UniqueContractsDeployed"});

            // To figure out which log contains the ContractDeployed event
            dev2PersonalizedAssets = await PersonalizedAssets.attach(deployedContracts[0].args.personalizedAssets);

            // Checks if the addresses are not the same
            expect(dev1PersonalizedAssets.address).not.equal(dev2PersonalizedAssets.address);
            
            // names and symbols should not be the same
            expect(await dev1PersonalizedAssets.name()).not.equal(await dev2PersonalizedAssets.name());
            expect(await dev1PersonalizedAssets.symbol()).not.equal(await dev2PersonalizedAssets.symbol());
        });

        it('Invalid Create Contract parameters', async () => {
            // Check initializer parameters
            var name1 = "Ragnarok Pets";
            var symbol1 = "RP"

            await expect(personalizedAssetsFactory.connect(developer1Address).createContracts(name1))
                .to.be.reverted;
            await expect(personalizedAssetsFactory.connect(developer1Address).createContracts(developer1Address, name1 , symbol1))
                .to.be.reverted;
            await expect(personalizedAssetsFactory.connect(developer1Address).createContracts())
                .to.be.reverted;
        });
    });

    describe("Update Contracts tests", () => {
        it('Update Contracts', async () => {
            expect(await personalizedAssetsFactory.personalizedAssetsImplementation()).to.equal(personalizedAssetsImpl.address);
            expect(await personalizedAssetsFactory.personalizedAssetsStorageImplementation()).to.equal(personalizedAssetsStorageImpl.address);
            // when personalizedAssetsFactory is initialized it uses updateContracts() which increments the contractVersion to 1
            expect(await personalizedAssetsFactory.contractVersion()).to.equal(1);

            // new versions of the contracts         
            newPersonalizedAssetsImpl = await PersonalizedAssets.deploy();
            newPersonalizedAssetsStorageImpl = await PersonalizedAssetsStorage.deploy();

            // update contract implementations with the new versions
            await personalizedAssetsFactory.connect(deployerAddress).updateContracts(newPersonalizedAssetsImpl.address, newPersonalizedAssetsStorageImpl.address);

            // checks that the contract implementations do not equal the old versions
            expect(await personalizedAssetsFactory.personalizedAssetsImplementation()).not.equal(personalizedAssetsImpl.address);
            expect(await personalizedAssetsFactory.personalizedAssetsStorageImplementation()).not.equal(personalizedAssetsStorageImpl.address);

            // checks that the contract implementations equal the new versions
            expect(await personalizedAssetsFactory.personalizedAssetsImplementation()).to.equal(newPersonalizedAssetsImpl.address);
            expect(await personalizedAssetsFactory.personalizedAssetsStorageImplementation()).to.equal(newPersonalizedAssetsStorageImpl.address);

            expect(await personalizedAssetsFactory.contractVersion()).to.equal(2);
        });

        it('Invalid Update Contracts', async () => {
            // new versions of the contracts         
            newPersonalizedAssetsImpl = await PersonalizedAssets.deploy();
            newPersonalizedAssetsStorageImpl = await PersonalizedAssetsStorage.deploy();

            // caller is not the owner
            await expect(personalizedAssetsFactory.connect(developer1Address).updateContracts(newPersonalizedAssetsImpl.address, newPersonalizedAssetsStorageImpl.address)).to.be.reverted;

            // invalid parameters
            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts(newPersonalizedAssetsImpl, newPersonalizedAssetsStorageImpl)).to.be.reverted;
            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts("", newPersonalizedAssetsStorageImpl.address)).to.be.reverted;

            // Checks for Address Zero
            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts(ethers.constants.AddressZero, newPersonalizedAssetsStorageImpl.address)).to.be.reverted;
            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts(newPersonalizedAssetsImpl.address, ethers.constants.AddressZero)).to.be.reverted;
        });

        it('Null parameters', async () => {
            // new versions of the contracts         
            newPersonalizedAssetsImpl = await PersonalizedAssets.deploy();
            newPersonalizedAssetsStorageImpl = await PersonalizedAssetsStorage.deploy();

            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts(null, newPersonalizedAssetsStorageImpl.address)).to.be.reverted;
            await expect(personalizedAssetsFactory.connect(deployerAddress).updateContracts(newPersonalizedAssetsImpl.address, null)).to.be.reverted;
        });
    });
});