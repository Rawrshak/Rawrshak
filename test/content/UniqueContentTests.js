const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique Content Contract Tests', () => {
    var developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress;
    var AccessControlManager, ContentStorage, Content, UniqueContentStorage, UniqueContent;
    var content;
    var contentStorage;
    var accessControlManager;
    var asset;
    var uniqueContent;
    var uniqueContentStorage;

    before(async () => {
        [developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress] = await ethers.getSigners();
        UniqueContent = await ethers.getContractFactory("UniqueContent");
        UniqueContentStorage = await ethers.getContractFactory("UniqueContentStorage");
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, developerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManager = await upgrades.deployProxy(AccessControlManager, []);
        contentStorage = await upgrades.deployProxy(ContentStorage, [developerAltAddress.address, 12000, "arweave.net/tx-contract-uri"]);
        content = await upgrades.deployProxy(Content, [contentStorage.address, accessControlManager.address]);

        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), content.address);

        // give developer address approval; This would normally be done through the ContentManager
        minter_role = await accessControlManager.MINTER_ROLE();
        await accessControlManager.grantRole(minter_role, developerAddress.address);

        // Set the content contract as the new parent
        await accessControlManager.setParent(content.address);
        await contentStorage.addAssetBatch(asset);

        // creatorAddress mints 2 of asset 0 and 1 of asset 1
        const signature = await sign(creatorAddress.address, [0, 1], [2, 1], 1, developerAddress.address, content.address);
        var mintData = [creatorAddress.address, [0, 1], [2, 1], 1, developerAddress.address, signature];
        await content.connect(creatorAddress).mintBatch(mintData);

        // launch unique content contracts
        uniqueContentStorage = await upgrades.deployProxy(UniqueContentStorage);
        uniqueContent = await upgrades.deployProxy(UniqueContent, ["Expensive Collection", "EC", uniqueContentStorage.address]);
        
        // Give unique content contract permission to transfer original asset
        await content.connect(creatorAddress).setApprovalForAll(uniqueContent.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Add interface checks
    });

    describe("Mint Tokens", () => {
        it('Mint function', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, true, 0, "arweave.net/tx/unique-uri-0", receivers, rates];

            expect(await content.balanceOf(creatorAddress.address, 0)).to.equal(2);

            results = await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueContent, "Mint");
            
            // checks whether the original asset has switched hands 
            expect(await content.balanceOf(creatorAddress.address, 0)).to.equal(1);
            expect(await content.balanceOf(uniqueContent.address, 0)).to.equal(1);

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
            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);

            // mint an asset with no royalties
            var uniqueAssetCreateData2 = [creatorAddress.address, content.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];

            results = await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData2);
            expect(results)
                .to.emit(uniqueContent, "Mint");

            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(2);
            expect(await uniqueContent["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent["tokenURI(uint256,uint256)"](1, 0)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await uniqueContent["tokenURI(uint256)"](1)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await uniqueContent.originalAssetUri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            
            var tokenFees = await uniqueContent.multipleRoyaltyInfo(1, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAltAddress.address);
            expect(tokenFees[1][0]).to.equal(12000);

            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
        });

        it('Mint to a different address', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            
            expect(await content.balanceOf(creatorAddress.address, 0)).to.equal(2);
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            // original item was taken from the creator's wallet
            expect(await content.balanceOf(creatorAddress.address, 0)).to.equal(1);
            // but the unique asset was sent to playerAddress
            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);
            
            // the person who minted the token still has creator status
            await uniqueContent.connect(creatorAddress).setTokenRoyalties(0,[creatorAddress.address],[10000]);
            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[1][1]).to.equal(10000);
        });

        it('Invalid mints', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [], [1]];
            var uniqueAssetCreateData2 = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [180001]];
            var uniqueAssetCreateData3 = [playerAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var uniqueAssetCreateData4 = [creatorAddress.address, content.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];
            var uniqueAssetCreateData5 = [creatorAddress.address, contentStorage.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

            // invalid royalties
            await expect(uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData)).to.be.reverted;
            await expect(uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData2)).to.be.reverted;
            // // player does not have the original asset
            await expect(uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData3)).to.be.reverted;
            // // player runs out of assets for second minting process
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData4);
            await expect(uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData4)).to.be.reverted;
            // contentStorage.address does not support IERC1155, IERC721, nor IERC2981 
            await expect(uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData5)).to.be.reverted;
        });    
    });

    describe("Burn Tokens", () => {
        it('Burn function', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, true, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            var uniqueAssetCreateData2 = [playerAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

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

            // checks whether the original asset has returned to msg.sender
            expect(await content.balanceOf(creatorAddress.address, 0)).to.equal(2);
            expect(await content.balanceOf(uniqueContent.address, 0)).to.equal(0);

            // (albiet not the creator) an owner can burn an asset that isn't locked. data.to != minter
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData2);
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(1)).to.equal(playerAddress.address);

            expect(await uniqueContent.connect(playerAddress).burn(1))
                .to.emit(uniqueContent, "Burn")
                .withArgs(1, playerAddress.address);

            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(0);
            await expect(uniqueContent.ownerOf(1)).to.be.reverted; // non-existent token

            await expect(uniqueContent["tokenURI(uint256,uint256)"](1, 0)).to.be.reverted;
            await expect(uniqueContent.originalAssetUri(1, 0)).to.be.reverted;
            await expect(uniqueContent.royaltyInfo(1, 50000)).to.be.reverted;
            await expect(uniqueContent.multipleRoyaltyInfo(1, 50000)).to.be.reverted;
        });

        it('Invalid burns', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var lockedAssetData = [creatorAddress.address, content.address, true, 0, "arweave.net/tx/unique-uri-0", [], []];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            await uniqueContent.connect(creatorAddress).mint(lockedAssetData);

            // player tries to burn an asset that belongs to someone else
            await expect(uniqueContent.connect(playerAddress).burn(0)).to.be.reverted;
            // burning a creator locked asset
            await uniqueContent.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 1);
            await expect(uniqueContent.connect(playerAddress).burn(1)).to.be.reverted;
            // burning a burned/non-existent token
            await uniqueContent.connect(creatorAddress).burn(0);
            await expect(uniqueContent.connect(creatorAddress).burn(0)).to.be.reverted;
            await expect(uniqueContent.connect(creatorAddress).burn(100)).to.be.reverted;
        });
    });

    describe("Transfer Tokens", () => {
        it('Transfer assets', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(0);

            var results = await uniqueContent.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(results)
                .to.emit(uniqueContent, 'Transfer')
                .withArgs(creatorAddress.address, playerAddress.address, 0);

            expect(await uniqueContent.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);
        });
        
        it('Invalid transfer', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueContent.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0)).to.be.reverted;
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            await contentStorage.setPublicUriBatch([[0, "arweave.net/tx/public-uri-0v2"]]);

            expect(await uniqueContent.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await uniqueContent.originalAssetUri(0, 1)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await uniqueContent.originalAssetUri(0, 100)).to.equal("arweave.net/tx/public-uri-0v2");
        });

        it('Set unique asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            await uniqueContent.connect(creatorAddress).setUniqueUri(0,"arweave.net/tx/unique-uri-0v2");
            
            expect(await uniqueContent["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent["tokenURI(uint256,uint256)"](0, 1)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueContent["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueContent["tokenURI(uint256,uint256)"](0, 100)).to.equal("arweave.net/tx/unique-uri-0v2");
        });

        it('Invalid set unique asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueContent.connect(creatorAddress).setUniqueUri(100, "arweave.net/tx/unique-uri-100")).to.be.reverted;
            await expect(uniqueContent.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0")).to.be.reverted;

            //transfers asset to another player and that player attempts to set unique uri
            await uniqueContent.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);
            await expect(uniqueContent.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
            expect(await uniqueContent["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            
            // creator can no longer set unique uri if they no longer own that asset
            await expect(uniqueContent.connect(creatorAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
        });
    });
    
    describe("Royalty Tests", () => {
        // Note: Original asset 0's royalty receiver is developerAddress and has a rate of 20,000
        // The content contract's royalty receiver is developerAltAddress and has a rate of 12,000
        it('Query royalties', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [5000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueContent.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(1000);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Set token royalties', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "", [], []];

            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await uniqueContent.connect(creatorAddress).setTokenRoyalties(0, [creatorAddress.address], [5000]);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);   
        });

        it('Invalid set token royalties', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, content.address, false, 0, "", [], []];

            await uniqueContent.connect(creatorAddress).mint(uniqueAssetCreateData);
            var receivers = [developerAltAddress.address, creatorAddress.address, receiverAddress.address];
            var invalidRates1 = [90000, 90000, 1];
            var invalidRates2 = [10000, 20000];
            var validRates = [10000, 20000, 30000];

            await expect(uniqueContent.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates1)).to.be.reverted;
            await expect(uniqueContent.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates2)).to.be.reverted;

            // transfers asset to another player and attempt to set token royalties
            await uniqueContent.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            // owner but not creator is unable set token royalties
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);
            await expect(uniqueContent.connect(playerAddress).setTokenRoyalties(0, receivers, validRates)).to.be.reverted;    
        });
    });
});