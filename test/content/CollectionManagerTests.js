const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Collection Manager Contract Tests', () => {
    var deployerAddress, craftingSystemAddress, playerAddress;
    var collectionManager;
    var collection;
    var collectionFactory;
    var asset;

    before(async () => {
        [deployerAddress, craftingSystemAddress, playerAddress] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        CollectionStorage = await ethers.getContractFactory("CollectionStorage");
        Collection = await ethers.getContractFactory("Collection");
        CollectionManager = await ethers.getContractFactory("CollectionManager");
        CollectionFactory = await ethers.getContractFactory("CollectionFactory");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManagerImpl = await AccessControlManager.deploy();
        collectionImpl = await Collection.deploy();
        collectionStorageImpl = await CollectionStorage.deploy();
        collectionManagerImpl = await CollectionManager.deploy();
        
        // Initialize Clone Factory
        collectionFactory = await upgrades.deployProxy(CollectionFactory, [collectionImpl.address, collectionManagerImpl.address, collectionStorageImpl.address, accessControlManagerImpl.address]);

        // deploy contracts
        var tx =  await collectionFactory.createContracts(deployerAddress.address, 10000, "arweave.net/tx-contract-uri");
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        collection = await Collection.attach(deployedContracts[0].args.collection);
        collectionManager = await CollectionManager.attach(deployedContracts[0].args.collectionManager);

        // give crafting system approval
        var approvalPair = [[craftingSystemAddress.address, true]];
        await collectionManager.registerOperators(approvalPair);

        // Add 2 assets
        await collectionManager.addAssetBatch(asset);
    });

    describe("Basic Tests", () => {
        it('Check Collection Manager proper deployment', async () => {
            expect(await collectionManager.collection()).to.equal(collection.address);
        });

        it('Check Supported interfaces', async () => {
            // Collection Manager interface
            expect(await collectionManager.supportsInterface("0x4eea5bfa")).to.equal(true);
        });
    });

    describe("Add Assets", () => {
        it('Add Single Asset', async () => {
            // Add 1 asset
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 1000, ethers.constants.AddressZero, 0]
            ];
            
            await collectionManager.addAssetBatch(newAssets);

            // const signature = await sign(playerAddress, [1], [1], 1, null, collection.address);
            var mintData = [playerAddress.address, [2], [10], 1, ethers.constants.AddressZero, []];
            await collection.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await collection['uri(uint256)'](2)).to.equal("arweave.net/tx/public-uri-2");
        });

        it('Add Mulitple Assets', async () => {
            // Add 3 assets
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 1000, deployerAddress.address, 10000],
                ["arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 20, ethers.constants.AddressZero, 0],
                ["arweave.net/tx/public-uri-4", "arweave.net/tx/private-uri-4", 1, deployerAddress.address, 50000]
            ];
            
            await collectionManager.addAssetBatch(newAssets);

            // const signature = await sign(playerAddress, [1], [1], 1, null, collection.address);
            var mintData = [playerAddress.address, [2, 3, 4], [10, 2, 1], 1, ethers.constants.AddressZero, []];
            await collection.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await collection['uri(uint256)'](2)).to.equal("arweave.net/tx/public-uri-2");
            expect(await collection.totalSupply(3)).to.equal(2);
            expect(await collection.maxSupply(4)).to.equal(1);
        });

        it('Set Token URI', async () => {
            var assetUri = [
                [1, "arweave.net/tx/public-uri-1-v1"]
            ];
            await collectionManager.setPublicUriBatch(assetUri);

            var mintData = [playerAddress.address, [1], [1], 1, ethers.constants.AddressZero, []];
            await collection.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await collection.connect(playerAddress)['uri(uint256,uint256)'](1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await collection.connect(playerAddress)['uri(uint256,uint256)'](1, 1)).to.equal("arweave.net/tx/public-uri-1-v1");
            expect(await collection.connect(playerAddress)['uri(uint256,uint256)'](1, 2)).to.equal("arweave.net/tx/public-uri-1-v1");
        });

        it('Set Token Contract Royalties', async () => {
            await collectionManager.setContractRoyalty(deployerAddress.address, 20000);

            var fees = await collection.royaltyInfo(1, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(20);
        });

        it('Set Token Royalties', async () => {
            var assetRoyalty = [[0, deployerAddress.address, 10000]];
            await collectionManager.setTokenRoyaltiesBatch(assetRoyalty);

            var fees = await collection.royaltyInfo(1, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(10);
        });
    });

    describe("Register Operator Tests", () => {
        it('Same operator address', async () => {
            var mintData = [playerAddress.address, [1], [5], 1, ethers.constants.AddressZero, []];

            // craftingSystemAddress should have minter role revoked
            var approvalPairs1 = [
                [craftingSystemAddress.address, true],
                [craftingSystemAddress.address, true],
                [craftingSystemAddress.address, false]
            ];

            await collectionManager.registerOperators(approvalPairs1);
            expect(await collectionManager.isMinter(craftingSystemAddress.address)).is.equal(false);
            await expect(collection.connect(craftingSystemAddress).mintBatch(mintData)).to.be.reverted;

            expect(await collection.totalSupply(1)).to.equal(0);

            // craftingSystemAddress should have minter role granted
            var approvalPairs2 = [
                [craftingSystemAddress.address, false],
                [craftingSystemAddress.address, false],
                [craftingSystemAddress.address, true]
            ];

            await collectionManager.registerOperators(approvalPairs2);
            expect(await collectionManager.isMinter(craftingSystemAddress.address)).is.equal(true);
            await collection.connect(craftingSystemAddress).mintBatch(mintData);
            expect(await collection.totalSupply(1)).to.equal(5);
        });

        it('Register System contract addresses', async () => {
            MockContract = await ethers.getContractFactory("MockContract");
            mockContract = await upgrades.deployProxy(MockContract, []);

            // craftingSystemAddress should have minter role revoked
            var systemContractPairs = [
                [mockContract.address, true],
                [mockContract.address, true],
                [mockContract.address, false]
            ];

            await collectionManager.registerSystemContracts(systemContractPairs);
            expect(await collection.isSystemContract(mockContract.address)).is.equal(false);

            // craftingSystemAddress should have minter role granted
            systemContractPairs = [
                [mockContract.address, false],
                [mockContract.address, false],
                [mockContract.address, true]
            ];

            await collectionManager.registerSystemContracts(systemContractPairs);
            expect(await collection.isSystemContract(mockContract.address)).is.equal(true);
        });

        it('Edge case parameters', async () => {
            var mintData = [playerAddress.address, [0], [100], 1, ethers.constants.AddressZero, []];

            var approvalPairs1 = [[null, true]];
            var approvalPairs2 = [["", false]];
            var approvalPairs3 = [[ethers.constants.AddressZero, true], [craftingSystemAddress.address, true]];
            // setting boolean to null would work as if it was set to false
            
            await expect(collectionManager.registerOperators(approvalPairs1)).to.be.reverted;
            await expect(collectionManager.registerOperators(approvalPairs2)).to.be.reverted;
            await collectionManager.registerOperators(approvalPairs3);
            
            await collection.connect(craftingSystemAddress).mintBatch(mintData);
            expect(await collection.totalSupply(0)).to.equal(100);
        });
    });
});
