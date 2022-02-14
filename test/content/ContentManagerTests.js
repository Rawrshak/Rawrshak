const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Content Manager Contract Tests', () => {
    var deployerAddress, craftingSystemAddress, playerAddress;
    var contentManager;
    var content;
    var contentFactory;
    var asset;

    before(async () => {
        [deployerAddress, craftingSystemAddress, playerAddress] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
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
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

        // give crafting system approval
        var approvalPair = [[craftingSystemAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
    });

    describe("Basic Tests", () => {
        it('Check Content Manager proper deployment', async () => {
            expect(await contentManager.content()).to.equal(content.address);
        });

        it('Check Supported interfaces', async () => {
            // Content Manager interface
            expect(await contentManager.supportsInterface("0xb0684770")).to.equal(true);
        });
    });

    describe("Add Assets", () => {
        it('Add Single Asset', async () => {
            // Add 1 asset
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 1000, ethers.constants.AddressZero, 0]
            ];
            
            await contentManager.addAssetBatch(newAssets);

            // const signature = await sign(playerAddress, [1], [1], 1, null, content.address);
            var mintData = [playerAddress.address, [2], [10], 1, ethers.constants.AddressZero, []];
            await content.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await content['uri(uint256)'](2)).to.equal("arweave.net/tx/public-uri-2");
        });

        it('Add Mulitple Assets', async () => {
            // Add 3 assets
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 1000, deployerAddress.address, 10000],
                ["arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 20, ethers.constants.AddressZero, 0],
                ["arweave.net/tx/public-uri-4", "arweave.net/tx/private-uri-4", 1, deployerAddress.address, 50000]
            ];
            
            await contentManager.addAssetBatch(newAssets);

            // const signature = await sign(playerAddress, [1], [1], 1, null, content.address);
            var mintData = [playerAddress.address, [2, 3, 4], [10, 2, 1], 1, ethers.constants.AddressZero, []];
            await content.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await content['uri(uint256)'](2)).to.equal("arweave.net/tx/public-uri-2");
            expect(await content.totalSupply(3)).to.equal(2);
            expect(await content.maxSupply(4)).to.equal(1);
        });

        it('Set Token URI', async () => {
            var assetUri = [
                [1, "arweave.net/tx/public-uri-1-v1"]
            ];
            await contentManager.setPublicUriBatch(assetUri);

            var mintData = [playerAddress.address, [1], [1], 1, ethers.constants.AddressZero, []];
            await content.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](1, 1)).to.equal("arweave.net/tx/public-uri-1-v1");
            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](1, 2)).to.equal("arweave.net/tx/public-uri-1-v1");
        });

        it('Set Token Contract Royalties', async () => {
            await contentManager.setContractRoyalty(deployerAddress.address, 20000);

            var fees = await content.royaltyInfo(1, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(20);
        });

        it('Set Token Royalties', async () => {
            var assetRoyalty = [[0, deployerAddress.address, 10000]];
            await contentManager.setTokenRoyaltiesBatch(assetRoyalty);

            var fees = await content.royaltyInfo(1, 1000);
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

            await contentManager.registerOperators(approvalPairs1);
            expect(await contentManager.isMinter(craftingSystemAddress.address)).is.equal(false);
            await expect(content.connect(craftingSystemAddress).mintBatch(mintData)).to.be.reverted;

            expect(await content.totalSupply(1)).to.equal(0);

            // craftingSystemAddress should have minter role granted
            var approvalPairs2 = [
                [craftingSystemAddress.address, false],
                [craftingSystemAddress.address, false],
                [craftingSystemAddress.address, true]
            ];

            await contentManager.registerOperators(approvalPairs2);
            expect(await contentManager.isMinter(craftingSystemAddress.address)).is.equal(true);
            await content.connect(craftingSystemAddress).mintBatch(mintData);
            expect(await content.totalSupply(1)).to.equal(5);
        });

        it('Edge case parameters', async () => {
            var mintData = [playerAddress.address, [0], [100], 1, ethers.constants.AddressZero, []];

            var approvalPairs1 = [[null, true]];
            var approvalPairs2 = [["", false]];
            var approvalPairs3 = [[ethers.constants.AddressZero, true], [craftingSystemAddress.address, true]];
            // setting boolean to null would work as if it was set to false
            
            await expect(contentManager.registerOperators(approvalPairs1)).to.be.reverted;
            await expect(contentManager.registerOperators(approvalPairs2)).to.be.reverted;
            await contentManager.registerOperators(approvalPairs3);
            
            await content.connect(craftingSystemAddress).mintBatch(mintData);
            expect(await content.totalSupply(0)).to.equal(100);
        });
    });
});
