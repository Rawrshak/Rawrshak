const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique ERC 721 Content Tests', () => {
    var developerAddress, creatorAddress, receiverAddress;
    var Erc721Contract, UniqueContentStorage, UniqueContent;
    var sampleContract;
    var uniqueContent;
    var uniqueContentStorage;

    before(async () => {
        [developerAddress, creatorAddress, receiverAddress] = await ethers.getSigners();
        UniqueContent = await ethers.getContractFactory("UniqueContent");
        UniqueContentStorage = await ethers.getContractFactory("UniqueContentStorage");
        Erc721Contract = await ethers.getContractFactory("TestErc721Contract");
    });

    beforeEach(async () => {
        sampleContract = await upgrades.deployProxy(Erc721Contract, ["Affordable Collection", "AC"]);

        // creatorAddress mints an ERC721 token
        await sampleContract.connect(creatorAddress).mint(creatorAddress.address, developerAddress.address, 5000, "arweave.net/tx/public-uri-0");

        // launch unique content contracts
        uniqueContentStorage = await upgrades.deployProxy(UniqueContentStorage);
        uniqueContent = await upgrades.deployProxy(UniqueContent, ["Expensive Collection", "EC", uniqueContentStorage.address]);
        
        // Give sampleContract contract permission to transfer original asset
        await sampleContract.connect(creatorAddress).setApprovalForAll(uniqueContent.address, true);
        await uniqueContent.connect(creatorAddress).setApprovalForAll(uniqueContent.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Add interface checks
    });

    describe("Mint and Burn Tokens", () => {
        it('Mint function', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, true];

            expect(await sampleContract.balanceOf(creatorAddress.address)).to.equal(1);

            results = await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueContent, "Mint");
            
            // checks whether the original asset has switched hands 
            expect(await sampleContract.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await sampleContract.balanceOf(uniqueContent.address)).to.equal(1);

            // checks whether the unique asset was minted to creatorAddress
            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(0)).to.equal(creatorAddress.address);

            expect(await uniqueContent["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");

            // check royalty rates by setting _salePrice to 1e6
            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][0]).to.equal(5000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);
        });

        it('Invalid mint', async () => {            
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", [], [], true];

            results = await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueContent, "Mint");
            
            var uniqueAssetCreateData2 = [creatorAddress.address, uniqueContent.address, 0, "arweave.net/tx/unique-uri-1", [], [], true];
            // try to create a unique asset from a unique asset
            await expect(uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData2)).to.be.reverted;
        });
    
        it('Burn function', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000], true];

            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(0)).to.equal(creatorAddress.address);

            // the creator can burn a creator locked asset
            expect(await uniqueContent.connect(creatorAddress).burn(0))
                .to.emit(uniqueContent, "Burn")
                .withArgs(0, creatorAddress.address);

            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(0);
            await expect(uniqueContent.ownerOf(0)).to.be.reverted; // non-existent token

            await expect(uniqueContent["tokenURI(uint256,uint256)"](0,0)).to.be.reverted;
            await expect(uniqueContent.originalAssetUri(0, 0)).to.be.reverted;
            await expect(uniqueContent.royaltyInfo(0, 50000)).to.be.reverted;
            await expect(uniqueContent.multipleRoyaltyInfo(0, 50000)).to.be.reverted;

            // original item should have returned to caller of the burn function
            expect(await sampleContract.balanceOf(uniqueContent.address)).to.equal(0);
            expect(await sampleContract.ownerOf(0)).to.equal(creatorAddress.address)
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000], false];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            await sampleContract.setTokenURI(0, "arweave.net/tx/public-uri-0v2");

            expect(await uniqueContent.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await uniqueContent.originalAssetUri(0, 100)).to.equal("arweave.net/tx/public-uri-0v2");
        });
    });
    
    describe("Royalty Tests", () => {
        it('Query royalties', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [10000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueContent.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(250);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
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
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            // update royalty
            await sampleContract.connect(creatorAddress).setTokenRoyalty(0, developerAddress.address, 10000);

            var tokenFees = await uniqueContent.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(500);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
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
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            // update royalty
            await sampleContract.connect(creatorAddress).setTokenRoyalty(0, developerAddress.address, 500000);

            var tokenFees = await uniqueContent.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(25000);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[1][0]).to.equal(50000);

            // additional royalties should be empty
            expect(tokenFees[0][1]).to.equal(ethers.constants.AddressZero);
            expect(tokenFees[0][2]).to.equal(ethers.constants.AddressZero);
            expect(tokenFees[1][1]).to.equal(0);
            expect(tokenFees[1][2]).to.equal(0);
        });
    });
});