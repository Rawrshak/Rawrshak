const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique ERC 721 Collection Tests', () => {
    var developerAddress, creatorAddress, receiverAddress;
    var Erc721Contract, UniqueCollectionStorage, UniqueCollection;
    var sampleContract;
    var uniqueCollection;
    var uniqueCollectionStorage;

    before(async () => {
        [developerAddress, creatorAddress, receiverAddress] = await ethers.getSigners();
        UniqueCollection = await ethers.getContractFactory("UniqueCollection");
        UniqueCollectionStorage = await ethers.getContractFactory("UniqueCollectionStorage");
        Erc721Contract = await ethers.getContractFactory("TestErc721Contract");
    });

    beforeEach(async () => {
        sampleContract = await upgrades.deployProxy(Erc721Contract, ["Affordable Collection", "AC"]);

        // creatorAddress mints an ERC721 token
        await sampleContract.connect(creatorAddress).mint(creatorAddress.address, developerAddress.address, 5000, "arweave.net/tx/public-uri-0");
        await sampleContract.connect(creatorAddress).mint(creatorAddress.address, developerAddress.address, 200001, "arweave.net/tx/public-uri-0");

        // launch unique collection contracts
        uniqueCollectionStorage = await upgrades.deployProxy(UniqueCollectionStorage);
        uniqueCollection = await upgrades.deployProxy(UniqueCollection, ["Expensive Collection", "EC", uniqueCollectionStorage.address]);
        
        // Give sampleContract contract permission to transfer original asset
        await sampleContract.connect(creatorAddress).setApprovalForAll(uniqueCollection.address, true);
        await uniqueCollection.connect(creatorAddress).setApprovalForAll(uniqueCollection.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Add interface checks
    });

    describe("Mint and Burn Tokens", () => {
        it('Mint function', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, true, 0, "arweave.net/tx/unique-uri-0", receivers, rates];

            expect(await sampleContract.balanceOf(creatorAddress.address)).to.equal(2);

            results = await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueCollection, "Mint");
            
            // checks whether the original asset has switched hands 
            expect(await sampleContract.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await sampleContract.balanceOf(uniqueCollection.address)).to.equal(1);

            // checks whether the unique asset was minted to creatorAddress
            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueCollection.ownerOf(0)).to.equal(creatorAddress.address);

            expect(await uniqueCollection["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueCollection["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueCollection.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");

            // check royalty rates by setting _salePrice to 1e6
            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][0]).to.equal(5000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);
        });

        it('Invalid mint', async () => {            
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, true, 0, "arweave.net/tx/unique-uri-0", [], []];
            // mint unique asset
            results = await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueCollection, "Mint");
            
            var uniqueAssetCreateData2 = [creatorAddress.address, uniqueCollection.address, true, 0, "arweave.net/tx/unique-uri-1", [], []];
            // try to create a unique asset from a unique asset
            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData2)).to.be.reverted;

            // cannot mint unique assets from assets with a royalty rate over 2e5
            var uniqueAssetCreateData3 = [creatorAddress.address, sampleContract.address, true, 1, "arweave.net/tx/unique-uri-0", [], []];

            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData3)).to.be.reverted;
        });
    
        it('Burn function', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, true, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];

            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueCollection.ownerOf(0)).to.equal(creatorAddress.address);

            // the creator can burn a creator locked asset
            expect(await uniqueCollection.connect(creatorAddress).burn(0))
                .to.emit(uniqueCollection, "Burn")
                .withArgs(0, creatorAddress.address);

            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(0);
            await expect(uniqueCollection.ownerOf(0)).to.be.reverted; // non-existent token

            await expect(uniqueCollection["tokenURI(uint256,uint256)"](0,0)).to.be.reverted;
            await expect(uniqueCollection.originalAssetUri(0, 0)).to.be.reverted;
            await expect(uniqueCollection.royaltyInfo(0, 50000)).to.be.reverted;
            await expect(uniqueCollection.multipleRoyaltyInfo(0, 50000)).to.be.reverted;

            // original item should have returned to caller of the burn function
            expect(await sampleContract.balanceOf(uniqueCollection.address)).to.equal(0);
            expect(await sampleContract.ownerOf(0)).to.equal(creatorAddress.address)
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            await sampleContract.setTokenURI(0, "arweave.net/tx/public-uri-0v2");

            expect(await uniqueCollection.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await uniqueCollection.originalAssetUri(0, 100)).to.equal("arweave.net/tx/public-uri-0v2");
        });
    });
    
    describe("Royalty Tests", () => {
        it('Query royalties', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [10000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueCollection.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(250);

            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(500);
            expect(tokenFees[1][1]).to.equal(1000);
            expect(tokenFees[1][2]).to.equal(1000);
        });

        it('Update Original Item Royalty', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [5000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            // update royalty
            await sampleContract.connect(creatorAddress).setTokenRoyalty(0, developerAddress.address, 10000);

            var tokenFees = await uniqueCollection.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(500);

            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(1000);
            expect(tokenFees[1][1]).to.equal(500);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Update Original Item Royalty to Over 2e5', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [5000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            // update royalty
            await sampleContract.connect(creatorAddress).setTokenRoyalty(0, developerAddress.address, 500000);

            var tokenFees = await uniqueCollection.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(25000);

            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[1][0]).to.equal(50000);

            // there should not be any additional royalties
            expect(tokenFees[0].length).to.equal(1);
            expect(tokenFees[1].length).to.equal(1);
        });
    });
});