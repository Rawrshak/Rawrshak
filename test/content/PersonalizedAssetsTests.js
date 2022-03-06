const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique Collection Contract Tests', () => {
    var developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress;
    var AccessControlManager, CollectionStorage, Collection, PersonalizedAssetsStorage, PersonalizedAssets;
    var collection;
    var collectionStorage;
    var accessControlManager;
    var asset;
    var personalizedAssets;
    var personalizedAssetsStorage;

    before(async () => {
        [developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress] = await ethers.getSigners();
        PersonalizedAssets = await ethers.getContractFactory("PersonalizedAssets");
        PersonalizedAssetsStorage = await ethers.getContractFactory("PersonalizedAssetsStorage");
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        CollectionStorage = await ethers.getContractFactory("CollectionStorage");
        Collection = await ethers.getContractFactory("Collection");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, developerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManager = await upgrades.deployProxy(AccessControlManager, []);
        collectionStorage = await upgrades.deployProxy(CollectionStorage, [developerAltAddress.address, 12000, "arweave.net/tx-contract-uri"]);
        collection = await upgrades.deployProxy(Collection, [collectionStorage.address, accessControlManager.address]);

        await collectionStorage.grantRole(await collectionStorage.DEFAULT_ADMIN_ROLE(), collection.address);

        // give developer address approval; This would normally be done through the CollectionManager
        minter_role = await accessControlManager.MINTER_ROLE();
        await accessControlManager.grantRole(minter_role, developerAddress.address);

        // Set the collection contract as the new parent
        await accessControlManager.setParent(collection.address);
        await collectionStorage.addAssetBatch(asset);

        // creatorAddress mints 2 of asset 0 and 1 of asset 1
        const signature = await sign(creatorAddress.address, [0, 1], [2, 1], 1, developerAddress.address, collection.address);
        var mintData = [creatorAddress.address, [0, 1], [2, 1], 1, developerAddress.address, signature];
        await collection.connect(creatorAddress).mintBatch(mintData);

        // launch personal assets contracts
        personalizedAssetsStorage = await upgrades.deployProxy(PersonalizedAssetsStorage);
        personalizedAssets = await upgrades.deployProxy(PersonalizedAssets, ["Expensive Collection", "EC", personalizedAssetsStorage.address]);
        
        // Give personal assets contract permission to transfer original asset
        await collection.connect(creatorAddress).setApprovalForAll(personalizedAssets.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Add interface checks
    });

    describe("Mint Tokens", () => {
        it('Mint function', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", receivers, rates];

            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);

            results = await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            expect(results)
                .to.emit(personalizedAssets, "Mint");
            
            // checks whether the original asset has switched hands 
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(1);
            expect(await collection.balanceOf(personalizedAssets.address, 0)).to.equal(1);

            // checks whether the unique asset was minted to creatorAddress
            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await personalizedAssets.ownerOf(0)).to.equal(creatorAddress.address);

            expect(await personalizedAssets["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await personalizedAssets["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await personalizedAssets.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");

            // check royalty rates by setting _salePrice to 1e6
            var tokenFees = await personalizedAssets.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);

            // mint an asset with no royalties
            var personalizedAssetCreateData2 = [creatorAddress.address, collection.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];

            results = await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData2);
            expect(results)
                .to.emit(personalizedAssets, "Mint");

            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(2);
            expect(await personalizedAssets["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await personalizedAssets["tokenURI(uint256,uint256)"](1, 0)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await personalizedAssets["tokenURI(uint256)"](1)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await personalizedAssets.originalAssetUri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            
            var tokenFees = await personalizedAssets.multipleRoyaltyInfo(1, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAltAddress.address);
            expect(tokenFees[1][0]).to.equal(12000);

            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
        });

        it('Mint to a different address', async () => {
            var personalizedAssetCreateData = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);

            // original item was taken from the creator's wallet
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(1);
            // but the personalized asset was sent to playerAddress
            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await personalizedAssets.balanceOf(playerAddress.address)).to.equal(1);
            expect(await personalizedAssets.ownerOf(0)).to.equal(playerAddress.address);
            
            // the person who minted the token still has creator status
            await personalizedAssets.connect(creatorAddress).setTokenRoyalties(0,[creatorAddress.address],[10000]);
            var tokenFees = await personalizedAssets.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[1][1]).to.equal(10000);
        });

        it('Invalid mints', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], [1]];
            var personalizedAssetCreateData2 = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [180001]];
            var personalizedAssetCreateData3 = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var personalizedAssetCreateData4 = [creatorAddress.address, collection.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];
            var personalizedAssetCreateData5 = [creatorAddress.address, collectionStorage.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

            // invalid royalties
            await expect(personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData)).to.be.reverted;
            await expect(personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData2)).to.be.reverted;
            // // player does not have the original asset
            await expect(personalizedAssets.connect(playerAddress).mint(personalizedAssetCreateData3)).to.be.reverted;
            // // player runs out of assets for second minting process
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData4);
            await expect(personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData4)).to.be.reverted;
            // collectionStorage.address does not support IERC1155, IERC721, nor IERC2981 
            await expect(personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData5)).to.be.reverted;
        });    
    });

    describe("Burn Tokens", () => {
        it('Burn function', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            var personalizedAssetCreateData2 = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await personalizedAssets.ownerOf(0)).to.equal(creatorAddress.address);

            // the creator can burn a creator locked asset
            expect(await personalizedAssets.connect(creatorAddress).burn(0))
                .to.emit(personalizedAssets, "Burn")
                .withArgs(0, creatorAddress.address);

            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(0);
            await expect(personalizedAssets.ownerOf(0)).to.be.reverted; // non-existent token

            await expect(personalizedAssets["tokenURI(uint256,uint256)"](0,0)).to.be.reverted;
            await expect(personalizedAssets.originalAssetUri(0, 0)).to.be.reverted;
            await expect(personalizedAssets.royaltyInfo(0, 50000)).to.be.reverted;
            await expect(personalizedAssets.multipleRoyaltyInfo(0, 50000)).to.be.reverted;

            // checks whether the original asset has returned to msg.sender
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);
            expect(await collection.balanceOf(personalizedAssets.address, 0)).to.equal(0);

            // (albiet not the creator) an owner can burn an asset that isn't locked. data.to != minter
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData2);
            expect(await personalizedAssets.balanceOf(playerAddress.address)).to.equal(1);
            expect(await personalizedAssets.ownerOf(1)).to.equal(playerAddress.address);

            expect(await personalizedAssets.connect(playerAddress).burn(1))
                .to.emit(personalizedAssets, "Burn")
                .withArgs(1, playerAddress.address);

            expect(await personalizedAssets.balanceOf(playerAddress.address)).to.equal(0);
            await expect(personalizedAssets.ownerOf(1)).to.be.reverted; // non-existent token

            await expect(personalizedAssets["tokenURI(uint256,uint256)"](1, 0)).to.be.reverted;
            await expect(personalizedAssets.originalAssetUri(1, 0)).to.be.reverted;
            await expect(personalizedAssets.royaltyInfo(1, 50000)).to.be.reverted;
            await expect(personalizedAssets.multipleRoyaltyInfo(1, 50000)).to.be.reverted;
        });

        it('Invalid burns', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var lockedAssetData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", [], []];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            await personalizedAssets.connect(creatorAddress).mint(lockedAssetData);

            // player tries to burn an asset that belongs to someone else
            await expect(personalizedAssets.connect(playerAddress).burn(0)).to.be.reverted;
            // burning a creator locked asset
            await personalizedAssets.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 1);
            await expect(personalizedAssets.connect(playerAddress).burn(1)).to.be.reverted;
            // burning a burned/non-existent token
            await personalizedAssets.connect(creatorAddress).burn(0);
            await expect(personalizedAssets.connect(creatorAddress).burn(0)).to.be.reverted;
            await expect(personalizedAssets.connect(creatorAddress).burn(100)).to.be.reverted;
        });
    });

    describe("Transfer Tokens", () => {
        it('Transfer assets', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);

            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await personalizedAssets.balanceOf(playerAddress.address)).to.equal(0);

            var results = await personalizedAssets.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(results)
                .to.emit(personalizedAssets, 'Transfer')
                .withArgs(creatorAddress.address, playerAddress.address, 0);

            expect(await personalizedAssets.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await personalizedAssets.ownerOf(0)).to.equal(playerAddress.address);
        });
        
        it('Invalid transfer', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            
            await expect(personalizedAssets.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0)).to.be.reverted;
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);

            await collectionStorage.setPublicUriBatch([[0, "arweave.net/tx/public-uri-0v2"]]);

            expect(await personalizedAssets.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await personalizedAssets.originalAssetUri(0, 1)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await personalizedAssets.originalAssetUri(0, 100)).to.equal("arweave.net/tx/public-uri-0v2");
        });

        it('Set personalized asset uri', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);

            await personalizedAssets.connect(creatorAddress).setUniqueUri(0,"arweave.net/tx/unique-uri-0v2");
            
            expect(await personalizedAssets["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await personalizedAssets["tokenURI(uint256,uint256)"](0, 1)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await personalizedAssets["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await personalizedAssets["tokenURI(uint256,uint256)"](0, 100)).to.equal("arweave.net/tx/unique-uri-0v2");
        });

        it('Invalid set personalized asset uri', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            
            await expect(personalizedAssets.connect(creatorAddress).setUniqueUri(100, "arweave.net/tx/unique-uri-100")).to.be.reverted;
            await expect(personalizedAssets.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0")).to.be.reverted;

            //transfers asset to another player and that player attempts to set unique uri
            await personalizedAssets.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(await personalizedAssets.ownerOf(0)).to.equal(playerAddress.address);
            await expect(personalizedAssets.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
            expect(await personalizedAssets["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            
            // creator can no longer set personalized asset uri if they no longer own that asset
            await expect(personalizedAssets.connect(creatorAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
        });
    });
    
    describe("Royalty Tests", () => {
        // Note: Original asset 0's royalty receiver is developerAddress and has a rate of 20,000
        // The collection contract's royalty receiver is developerAltAddress and has a rate of 12,000
        it('Query royalties', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [5000, 5000];
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);

            var tokenFees = await personalizedAssets.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(1000);

            var tokenFees = await personalizedAssets.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Set token royalties', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "", [], []];

            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            
            await personalizedAssets.connect(creatorAddress).setTokenRoyalties(0, [creatorAddress.address], [5000]);

            var tokenFees = await personalizedAssets.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);   
        });

        it('Invalid set token royalties', async () => {
            var personalizedAssetCreateData = [creatorAddress.address, collection.address, false, 0, "", [], []];

            await personalizedAssets.connect(creatorAddress).mint(personalizedAssetCreateData);
            var receivers = [developerAltAddress.address, creatorAddress.address, receiverAddress.address];
            var invalidRates1 = [90000, 90000, 1];
            var invalidRates2 = [10000, 20000];
            var validRates = [10000, 20000, 30000];

            await expect(personalizedAssets.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates1)).to.be.reverted;
            await expect(personalizedAssets.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates2)).to.be.reverted;

            // transfers asset to another player and attempt to set token royalties
            await personalizedAssets.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            // owner but not creator is unable set token royalties
            expect(await personalizedAssets.ownerOf(0)).to.equal(playerAddress.address);
            await expect(personalizedAssets.connect(playerAddress).setTokenRoyalties(0, receivers, validRates)).to.be.reverted;    
        });
    });
});