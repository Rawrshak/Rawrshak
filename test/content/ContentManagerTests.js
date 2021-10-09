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
            [1, "arweave.net/tx/public-uri-1", "", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            [2, "arweave.net/tx/public-uri-2", "", 100, ethers.constants.AddressZero, 0],
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

        // // Add 1 asset
        await contentManager.addAssetBatch(asset);
    });

    describe("Basic Tests", () => {
        it('Check Content Manager proper deployment', async () => {
            expect(await contentManager.content()).to.equal(content.address);
        });

        it('Check Supported interfaces', async () => {
            // Content Storage interface
            expect(await contentManager.supportsInterface("0xEAD82167")).to.equal(true);
        });
    });

    describe("Add Assets", () => {
        it('Add Assets', async () => {
            // Add 1 asset
            var newAssets = [
                [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 1000, ethers.constants.AddressZero, 0]
            ];
            
            await contentManager.addAssetBatch(newAssets);

            // const signature = await sign(playerAddress, [1], [1], 1, null, content.address);
            var mintData = [playerAddress.address, [3], [10], 1, ethers.constants.AddressZero, []];
            await content.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await content['uri(uint256)'](3)).to.equal("arweave.net/tx/public-uri-3");
        });

        it('Set Token URI', async () => {
            var assetUri = [
                [2, "arweave.net/tx/public-uri-2-v1"]
            ];
            await contentManager.setPublicUriBatch(assetUri);

            var mintData = [playerAddress.address, [2], [1], 1, ethers.constants.AddressZero, []];
            await content.connect(craftingSystemAddress).mintBatch(mintData);

            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](2, 0)).to.equal("arweave.net/tx/public-uri-2");
            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](2, 1)).to.equal("arweave.net/tx/public-uri-2-v1");
            expect(await content.connect(playerAddress)['uri(uint256,uint256)'](2, 2)).to.equal("arweave.net/tx/public-uri-2-v1");
        });

        it('Set Token Contract Royalties', async () => {
            await contentManager.setContractRoyalty(deployerAddress.address, 20000);

            var fees = await content.royaltyInfo(2, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(20);
        });

        it('Set Token Royalties', async () => {
            var assetRoyalty = [[1, deployerAddress.address, 10000]];
            await contentManager.setTokenRoyaltiesBatch(assetRoyalty);

            var fees = await content.royaltyInfo(2, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(10);
        });
    });
});
