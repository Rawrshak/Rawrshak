const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique Content Storage Contract Tests', () => {
    var developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress;
    var AccessControlManager, ContentStorage, Content, UniqueContentStorage, Erc721Contract;
    var content;
    var contentStorage;
    var accessControlManager;
    var sampleContract;
    var asset;
    var uniqueContentStorage;

    before(async () => {
        [developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress] = await ethers.getSigners();
        UniqueContentStorage = await ethers.getContractFactory("UniqueContentStorage");
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        Erc721Contract = await ethers.getContractFactory("TestErc721Contract");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, developerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManager = await upgrades.deployProxy(AccessControlManager, []);
        contentStorage = await upgrades.deployProxy(ContentStorage, [developerAltAddress.address, 12000, "arweave.net/tx-contract-uri"]);
        content = await upgrades.deployProxy(Content, [contentStorage.address, accessControlManager.address]);
        sampleContract = await upgrades.deployProxy(Erc721Contract, ["Affordable Collection", "AC"]);

        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), content.address);

        // Set the content contract as the new parent
        await accessControlManager.setParent(content.address);
        await contentStorage.addAssetBatch(asset);

        // launch unique content storage contract
        uniqueContentStorage = await upgrades.deployProxy(UniqueContentStorage);

        // creatorAddress mints an ERC721 token
        await sampleContract.connect(creatorAddress).mint(creatorAddress.address, developerAddress.address, 5000, "arweave.net/tx/public-uri-100");
    });

    describe("Unique Asset Info", () => {
        it('Set and Burn info', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, true];

            // record info
            expect(await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address))
                .to.emit(uniqueContentStorage, "TokenRoyaltiesUpdated")
                .withArgs(0, [creatorAddress.address, receiverAddress.address], [15000, 10000]);;

            // check whether the info has been recorded
            var tokenFees = await uniqueContentStorage.getMultipleRoyalties(0, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);

            expect(await uniqueContentStorage.isCreator(0, creatorAddress.address)).to.equal(true);
            assetData = await uniqueContentStorage.getAssetData(0);
            expect(assetData[0]).to.equal(0);
            expect(assetData[1]).to.equal(content.address);
            expect(await uniqueContentStorage.isLocked(0)).to.equal(true);
            expect(await uniqueContentStorage.tokenURI(0, 100)).to.equal("arweave.net/tx/unique-uri-0");

            // burn info
            await uniqueContentStorage.burnUniqueAssetInfo(0);

            // check whether the info has been deleted
            await expect(uniqueContentStorage.getMultipleRoyalties(0, 1000000)).to.be.reverted;
            expect(await uniqueContentStorage.isCreator(0, creatorAddress.address)).to.equal(false);
            assetData = await uniqueContentStorage.getAssetData(0);
            expect(assetData[0]).to.equal(ethers.constants.AddressZero);
            expect(assetData[1]).to.equal(ethers.constants.AddressZero);
            expect(await uniqueContentStorage.isLocked(0)).to.equal(false);
            await expect(uniqueContentStorage.tokenURI(0, 0)).to.be.reverted;
        });   
    });

    describe("Uri Tests", () => {
        it('Update unique asset uri', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [], [], false];
            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, playerAddress.address);

            await expect(uniqueContentStorage.connect(playerAddress).setUniqueUri(0,"arweave.net/tx/unique-uri-0v2"))
                .to.emit(uniqueContentStorage, "UniqueUriUpdated")
                .withArgs(0, 1);

            expect(await uniqueContentStorage.tokenURI(0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContentStorage.tokenURI(0, 1)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueContentStorage.tokenURI(0, 100)).to.equal("arweave.net/tx/unique-uri-0v2");
        });
    });

    describe("Royalty Tests", () => {
        // Note: Original asset 0's royalty receiver is developerAddress and has a rate of 20,000
        // The content contract's royalty receiver is developerAltAddress and has a rate of 12,000
        it('Calculate multiple royalty amounts', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [10000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address);

            var tokenFees = await uniqueContentStorage.getMultipleRoyalties(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(1000);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Query original item royalty', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, 0, "", [], [], false];
            var uniqueAssetCreateData2 = [creatorAddress.address, content.address, 1, "", [creatorAddress.address], [10000], false];

            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address);

            var tokenFees = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(20000);

            // a token with no set royalties should return the default contract royalties
            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData2, 1, creatorAddress.address);

            tokenFees = await uniqueContentStorage.getRoyalty(1, 1000000);
            // token royalty from contract royalty
            expect(tokenFees.receiver).to.equal(developerAltAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(12000);
        });

        it('Update original item royalty', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [10000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, 0, "", receivers, rates, false];

            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address);

            var tokenFees = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(20000);

            await contentStorage.setTokenRoyaltiesBatch([[0, developerAltAddress.address, 15000]]);

            var tokenFees2 = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFees2.receiver).to.equal(developerAltAddress.address);
            expect(tokenFees2.royaltyAmount).to.equal(15000);

            var tokenFees = await uniqueContentStorage.getMultipleRoyalties(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAltAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(1500);
            expect(tokenFees[1][1]).to.equal(1000);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Original royalty update pushes total over limit', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address, playerAddress.address];
            var rates = [60000, 30000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, 0, "", receivers, rates, false];

            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address);

            var tokenFees = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(20000);

            // original royalty updates pushes total to 20,000 over the limit of 2e5
            await contentStorage.setTokenRoyaltiesBatch([[0, developerAltAddress.address, 120000]]);

            var tokenFees2 = await uniqueContentStorage.getMultipleRoyalties(0, 20000);
            expect(tokenFees2[0][0]).to.equal(developerAltAddress.address);
            expect(tokenFees2[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees2[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees2[0][3]).to.equal(playerAddress.address);
            expect(tokenFees2[1][0]).to.equal(2400);
            // remaining royalties have to be split
            expect(tokenFees2[1][1]).to.equal(960);
            expect(tokenFees2[1][2]).to.equal(480);
            expect(tokenFees2[1][3]).to.equal(160);

            await contentStorage.setTokenRoyaltiesBatch([[0, developerAddress.address, 199995]]);

            var tokenFees3 = await uniqueContentStorage.getMultipleRoyalties(0, 1000000);
            expect(tokenFees3[0][0]).to.equal(developerAddress.address);
            expect(tokenFees3[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees3[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees3[0][3]).to.equal(playerAddress.address);
            expect(tokenFees3[1][0]).to.equal(199995);
            expect(tokenFees3[1][1]).to.equal(3);
            expect(tokenFees3[1][2]).to.equal(1);
            expect(tokenFees3[1][3]).to.equal(0);
        });

        it('Update royalty to equal 2e5 and over 2e5', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address, playerAddress.address];
            var rates = [40000, 30000, 20000];
            var uniqueAssetCreateData = [creatorAddress.address, sampleContract.address, 0, "", receivers, rates, false];

            await uniqueContentStorage.setUniqueAssetInfo(uniqueAssetCreateData, 0, creatorAddress.address);

            var tokenFee = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFee.receiver).to.equal(developerAddress.address);
            expect(tokenFee.royaltyAmount).to.equal(5000);

            var tokenFees = await uniqueContentStorage.getMultipleRoyalties(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[0][3]).to.equal(playerAddress.address);
            expect(tokenFees[1][0]).to.equal(500);
            expect(tokenFees[1][1]).to.equal(4000);
            expect(tokenFees[1][2]).to.equal(3000);
            expect(tokenFees[1][3]).to.equal(2000);

            // update royalty rate to 200000
            await sampleContract.setTokenRoyalty(0, developerAddress.address, 200000);

            var tokenFee2 = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFee2.receiver).to.equal(developerAddress.address);
            expect(tokenFee2.royaltyAmount).to.equal(200000);

            var tokenFees2 = await uniqueContentStorage.getMultipleRoyalties(0, 200000);
            expect(tokenFees2[0][0]).to.equal(developerAddress.address);
            expect(tokenFees2[0].length).to.equal(1);
            expect(tokenFees2[1][0]).to.equal(40000);
            expect(tokenFees2[1].length).to.equal(1);

            // update royalty rate to over 200000
            await sampleContract.setTokenRoyalty(0, developerAddress.address, 300000);

            var tokenFee3 = await uniqueContentStorage.getRoyalty(0, 1000000);
            expect(tokenFee3.receiver).to.equal(developerAddress.address);
            expect(tokenFee3.royaltyAmount).to.equal(300000);

            var tokenFees3 = await uniqueContentStorage.getMultipleRoyalties(0, 50000);
            expect(tokenFees3[0][0]).to.equal(developerAddress.address);
            expect(tokenFees3[0].length).to.equal(1);
            expect(tokenFees3[1][0]).to.equal(15000);
            expect(tokenFees3[1].length).to.equal(1);
        });
    });
});