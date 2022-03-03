const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique Collection Contract Tests', () => {
    var developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress;
    var AccessControlManager, CollectionStorage, Collection, UniqueCollectionStorage, UniqueCollection;
    var collection;
    var collectionStorage;
    var accessControlManager;
    var asset;
    var uniqueCollection;
    var uniqueCollectionStorage;

    before(async () => {
        [developerAddress, developerAltAddress, creatorAddress, receiverAddress, playerAddress] = await ethers.getSigners();
        UniqueCollection = await ethers.getContractFactory("UniqueCollection");
        UniqueCollectionStorage = await ethers.getContractFactory("UniqueCollectionStorage");
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

        // launch unique collection contracts
        uniqueCollectionStorage = await upgrades.deployProxy(UniqueCollectionStorage);
        uniqueCollection = await upgrades.deployProxy(UniqueCollection, ["Expensive Collection", "EC", uniqueCollectionStorage.address]);
        
        // Give unique collection contract permission to transfer original asset
        await collection.connect(creatorAddress).setApprovalForAll(uniqueCollection.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Add interface checks
    });

    describe("Mint Tokens", () => {
        it('Mint function', async () => {            
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [15000, 10000];
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", receivers, rates];

            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);

            results = await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            expect(results)
                .to.emit(uniqueCollection, "Mint");
            
            // checks whether the original asset has switched hands 
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(1);
            expect(await collection.balanceOf(uniqueCollection.address, 0)).to.equal(1);

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
            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(15000);
            expect(tokenFees[1][2]).to.equal(10000);

            // mint an asset with no royalties
            var uniqueAssetCreateData2 = [creatorAddress.address, collection.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];

            results = await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData2);
            expect(results)
                .to.emit(uniqueCollection, "Mint");

            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(2);
            expect(await uniqueCollection["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueCollection["tokenURI(uint256,uint256)"](1, 0)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await uniqueCollection["tokenURI(uint256)"](1)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await uniqueCollection.originalAssetUri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            
            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(1, 1000000);
            expect(tokenFees[0][0]).to.equal(developerAltAddress.address);
            expect(tokenFees[1][0]).to.equal(12000);

            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
        });

        it('Mint to a different address', async () => {
            var uniqueAssetCreateData = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            // original item was taken from the creator's wallet
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(1);
            // but the unique asset was sent to playerAddress
            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await uniqueCollection.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueCollection.ownerOf(0)).to.equal(playerAddress.address);
            
            // the person who minted the token still has creator status
            await uniqueCollection.connect(creatorAddress).setTokenRoyalties(0,[creatorAddress.address],[10000]);
            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[1][1]).to.equal(10000);
        });

        it('Invalid mints', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], [1]];
            var uniqueAssetCreateData2 = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [180001]];
            var uniqueAssetCreateData3 = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var uniqueAssetCreateData4 = [creatorAddress.address, collection.address, false, 1, "arweave.net/tx/unique-uri-1", [], []];
            var uniqueAssetCreateData5 = [creatorAddress.address, collectionStorage.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

            // invalid royalties
            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData)).to.be.reverted;
            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData2)).to.be.reverted;
            // // player does not have the original asset
            await expect(uniqueCollection.connect(playerAddress).mint(uniqueAssetCreateData3)).to.be.reverted;
            // // player runs out of assets for second minting process
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData4);
            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData4)).to.be.reverted;
            // collectionStorage.address does not support IERC1155, IERC721, nor IERC2981 
            await expect(uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData5)).to.be.reverted;
        });    
    });

    describe("Burn Tokens", () => {
        it('Burn function', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            var uniqueAssetCreateData2 = [playerAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];

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

            // checks whether the original asset has returned to msg.sender
            expect(await collection.balanceOf(creatorAddress.address, 0)).to.equal(2);
            expect(await collection.balanceOf(uniqueCollection.address, 0)).to.equal(0);

            // (albiet not the creator) an owner can burn an asset that isn't locked. data.to != minter
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData2);
            expect(await uniqueCollection.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueCollection.ownerOf(1)).to.equal(playerAddress.address);

            expect(await uniqueCollection.connect(playerAddress).burn(1))
                .to.emit(uniqueCollection, "Burn")
                .withArgs(1, playerAddress.address);

            expect(await uniqueCollection.balanceOf(playerAddress.address)).to.equal(0);
            await expect(uniqueCollection.ownerOf(1)).to.be.reverted; // non-existent token

            await expect(uniqueCollection["tokenURI(uint256,uint256)"](1, 0)).to.be.reverted;
            await expect(uniqueCollection.originalAssetUri(1, 0)).to.be.reverted;
            await expect(uniqueCollection.royaltyInfo(1, 50000)).to.be.reverted;
            await expect(uniqueCollection.multipleRoyaltyInfo(1, 50000)).to.be.reverted;
        });

        it('Invalid burns', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [], []];
            var lockedAssetData = [creatorAddress.address, collection.address, true, 0, "arweave.net/tx/unique-uri-0", [], []];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            await uniqueCollection.connect(creatorAddress).mint(lockedAssetData);

            // player tries to burn an asset that belongs to someone else
            await expect(uniqueCollection.connect(playerAddress).burn(0)).to.be.reverted;
            // burning a creator locked asset
            await uniqueCollection.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 1);
            await expect(uniqueCollection.connect(playerAddress).burn(1)).to.be.reverted;
            // burning a burned/non-existent token
            await uniqueCollection.connect(creatorAddress).burn(0);
            await expect(uniqueCollection.connect(creatorAddress).burn(0)).to.be.reverted;
            await expect(uniqueCollection.connect(creatorAddress).burn(100)).to.be.reverted;
        });
    });

    describe("Transfer Tokens", () => {
        it('Transfer assets', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(1);
            expect(await uniqueCollection.balanceOf(playerAddress.address)).to.equal(0);

            var results = await uniqueCollection.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(results)
                .to.emit(uniqueCollection, 'Transfer')
                .withArgs(creatorAddress.address, playerAddress.address, 0);

            expect(await uniqueCollection.balanceOf(creatorAddress.address)).to.equal(0);
            expect(await uniqueCollection.ownerOf(0)).to.equal(playerAddress.address);
        });
        
        it('Invalid transfer', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueCollection.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0)).to.be.reverted;
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            await collectionStorage.setPublicUriBatch([[0, "arweave.net/tx/public-uri-0v2"]]);

            expect(await uniqueCollection.originalAssetUri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await uniqueCollection.originalAssetUri(0, 1)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await uniqueCollection.originalAssetUri(0, 100)).to.equal("arweave.net/tx/public-uri-0v2");
        });

        it('Set unique asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            await uniqueCollection.connect(creatorAddress).setUniqueUri(0,"arweave.net/tx/unique-uri-0v2");
            
            expect(await uniqueCollection["tokenURI(uint256,uint256)"](0, 0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueCollection["tokenURI(uint256,uint256)"](0, 1)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueCollection["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueCollection["tokenURI(uint256,uint256)"](0, 100)).to.equal("arweave.net/tx/unique-uri-0v2");
        });

        it('Invalid set unique asset uri', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", [creatorAddress.address], [20000]];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueCollection.connect(creatorAddress).setUniqueUri(100, "arweave.net/tx/unique-uri-100")).to.be.reverted;
            await expect(uniqueCollection.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0")).to.be.reverted;

            //transfers asset to another player and that player attempts to set unique uri
            await uniqueCollection.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            
            expect(await uniqueCollection.ownerOf(0)).to.equal(playerAddress.address);
            await expect(uniqueCollection.connect(playerAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
            expect(await uniqueCollection["tokenURI(uint256)"](0)).to.equal("arweave.net/tx/unique-uri-0");
            
            // creator can no longer set unique uri if they no longer own that asset
            await expect(uniqueCollection.connect(creatorAddress).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
        });
    });
    
    describe("Royalty Tests", () => {
        // Note: Original asset 0's royalty receiver is developerAddress and has a rate of 20,000
        // The collection contract's royalty receiver is developerAltAddress and has a rate of 12,000
        it('Query royalties', async () => {
            var receivers = [creatorAddress.address, receiverAddress.address];
            var rates = [5000, 5000];
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "arweave.net/tx/unique-uri-0", receivers, rates];
            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueCollection.royaltyInfo(0, 50000);
            expect(tokenFees.receiver).to.equal(developerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(1000);

            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Set token royalties', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "", [], []];

            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            
            await uniqueCollection.connect(creatorAddress).setTokenRoyalties(0, [creatorAddress.address], [5000]);

            var tokenFees = await uniqueCollection.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
    
            expect(tokenFees[1][0]).to.equal(2000);
            expect(tokenFees[1][1]).to.equal(500);   
        });

        it('Invalid set token royalties', async () => {
            var uniqueAssetCreateData = [creatorAddress.address, collection.address, false, 0, "", [], []];

            await uniqueCollection.connect(creatorAddress).mint(uniqueAssetCreateData);
            var receivers = [developerAltAddress.address, creatorAddress.address, receiverAddress.address];
            var invalidRates1 = [90000, 90000, 1];
            var invalidRates2 = [10000, 20000];
            var validRates = [10000, 20000, 30000];

            await expect(uniqueCollection.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates1)).to.be.reverted;
            await expect(uniqueCollection.connect(creatorAddress).setTokenRoyalties(0, receivers, invalidRates2)).to.be.reverted;

            // transfers asset to another player and attempt to set token royalties
            await uniqueCollection.connect(creatorAddress)["safeTransferFrom(address,address,uint256)"](creatorAddress.address, playerAddress.address, 0);
            // owner but not creator is unable set token royalties
            expect(await uniqueCollection.ownerOf(0)).to.equal(playerAddress.address);
            await expect(uniqueCollection.connect(playerAddress).setTokenRoyalties(0, receivers, validRates)).to.be.reverted;    
        });
    });
});