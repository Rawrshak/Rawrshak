const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('CollectionStorage Contract Tests', () => {
    var CollectionStorage;
    var collectionStorage;
    var deployerAddress, playerAddress;

    before(async () => {
        [deployerAddress, playerAddress] = await ethers.getSigners();
        CollectionStorage = await ethers.getContractFactory("CollectionStorage");
    });

    beforeEach(async () => {
        collectionStorage = await upgrades.deployProxy(CollectionStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
    });

    describe("Basic Tests", () => {
        it('Check Collection Storage proper deployment', async () => {
            // Check Contract Royalties
            var contractFees = await collectionStorage.getRoyalty(0);
            expect(contractFees.receiver).to.equal(deployerAddress.address);
            expect(contractFees.rate).to.equal(10000);
        });
        
        it('Check CollectionStorage Contract Interfaces', async () => {
            // ICollectionStorage Interface
            expect(await collectionStorage.supportsInterface("0xb8c03b75")).to.equal(true);

            // ICollectionSubsystemBase Interface
            expect(await collectionStorage.supportsInterface("0x7460af1d")).to.equal(true);
                
            // IContractUri interface
            expect(await collectionStorage.supportsInterface("0xc0e24d5e")).to.equal(true);

            // IAccessControlUpgradeable Interface
            expect(await collectionStorage.supportsInterface("0x7965db0b")).to.equal(true);
        });
    
        it('Check role permissions', async () => {
            var default_admin_role = await collectionStorage.DEFAULT_ADMIN_ROLE();
    
            expect(await collectionStorage.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
            expect(await collectionStorage.hasRole(default_admin_role, playerAddress.address)).to.equal(false);
        });

        it('Unauthorized caller', async () => {
            var asset = [["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0",  100, deployerAddress.address, 20000]];
            await collectionStorage.addAssetBatch(asset);

            await expect(collectionStorage.connect(playerAddress).updateSupply(0, 50)).to.be.reverted;
            await expect(collectionStorage.connect(playerAddress).setPublicUriBatch([[0, ""]])).to.be.reverted;
            await expect(collectionStorage.connect(playerAddress).setHiddenUriBatch([[0, ""]])).to.be.reverted;
            await expect(collectionStorage.connect(playerAddress).setContractRoyalty(playerAddress.address, 200000)).to.be.reverted;
            await expect(collectionStorage.connect(playerAddress).setTokenRoyaltiesBatch([[0, playerAddress.address, 50000]])).to.be.reverted;
        });
    });
    
    describe("Assets Info", () => {
        // CreateData
        // {
        //     publicDataUri,
        //     hiddenDataUri,
        //     maxSupply
        //     royaltyReceiver,
        //     royaltyRate
        // }
    
        it('Add single asset', async () => {
            var asset = [["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0",  100, deployerAddress.address, 20000]];
            var results = await collectionStorage.addAssetBatch(asset);
    
            await expect(results)
                .to.emit(collectionStorage, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 0, deployerAddress.address, 20000);

            await expect(results)
                .to.emit(collectionStorage, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 0, 0);
                
            await expect(results)
                .to.emit(collectionStorage, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 0, 0);
            
            await expect(results)
                .to.emit(collectionStorage, 'AssetsAdded');
            
            expect(await collectionStorage.supply(0))
                .to.equal(0);
            expect(await collectionStorage.maxSupply(0))
                .to.equal(100);
            
            tokenFees = await collectionStorage.getRoyalty(0);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(20000);
            
            expect(await collectionStorage.uri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await collectionStorage.hiddenUri(0, 0)).to.equal("arweave.net/tx/private-uri-0");
        });

        it('Add multiple assets', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0]
            ];
            var results = await collectionStorage.addAssetBatch(asset);
            
            // Check the token URIs
            await expect(results)
                .to.emit(collectionStorage, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 0, 0);
            
            await expect(results)
                .to.emit(collectionStorage, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);

            await expect(results)
                .to.emit(collectionStorage, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 0, deployerAddress.address, 20000);
            
            await expect(results)
                .to.emit(collectionStorage, 'AssetsAdded');
            
            expect(await collectionStorage.supply(0))
                .to.equal(0);
            expect(await collectionStorage.maxSupply(1))
                .to.equal(10);
        });

        it('Add mutliple assets, one with invalid fee', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", 1000, deployerAddress.address, 400000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, deployerAddress.address, 0]
            ];
            await expect(collectionStorage.addAssetBatch(asset)).to.be.reverted;
        });

        it('Set max supply to zero', async () => {
            var asset = [["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0",  0, deployerAddress.address, 30000]];
            var results = await collectionStorage.addAssetBatch(asset);
    
            expect(await collectionStorage.maxSupply(0))
                .to.equal(ethers.constants.MaxUint256);
        });
    });
    
    describe("Contract Interactions", () => {
        
        it('Update the current asset supply', async () => {
            var asset = [["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", 100, deployerAddress.address, 20000]];
            await collectionStorage.addAssetBatch(asset);

            expect(await collectionStorage.supply(0)).to.equal(0);

            await collectionStorage.updateSupply(0, 5); 

            expect(await collectionStorage.supply(0)).to.equal(5);
        });
        
        it('Basic Royalties tests', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0],
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, deployerAddress.address, 30000]
            ];
            await collectionStorage.addAssetBatch(asset);

            tokenFees = await collectionStorage.getRoyalty(0);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(20000);
                
            tokenFees = await collectionStorage.getRoyalty(1);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(10000);
                
            tokenFees = await collectionStorage.getRoyalty(2);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(30000);
        });

        it('Basic Uri tests', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0],
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, deployerAddress.address, 0]
            ];
            await collectionStorage.addAssetBatch(asset);

            // Test Public Uri
            expect(await collectionStorage.uri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await collectionStorage.uri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await collectionStorage.uri(2, 0)).to.equal("arweave.net/tx/public-uri-2");
                
            // Test Hidden Uri
            expect(await collectionStorage.hiddenUri(0, 0)).to.equal("arweave.net/tx/private-uri-0");
            expect(await collectionStorage.hiddenUri(1, 0)).to.equal("arweave.net/tx/private-uri-1");
            expect(await collectionStorage.hiddenUri(2, 0)).to.equal("arweave.net/tx/private-uri-2");
                
            // Update Asset 2
            var assetUri = [
                [1, "arweave.net/tx/private-uri-1v1"]
            ];
            
            await expect(collectionStorage.setHiddenUriBatch(assetUri))
                .to.emit(collectionStorage, 'HiddenUriUpdated');
            
            expect(await collectionStorage.hiddenUri(1, 1)).to.equal("arweave.net/tx/private-uri-1v1");
                
            // Update Asset 3
            var assetUri = [
                [2, "arweave.net/tx/public-uri-2v1"]
            ];
            
            await expect(collectionStorage.setPublicUriBatch(assetUri))
                .to.emit(collectionStorage, 'PublicUriUpdated');
                
            expect(await collectionStorage.uri(2, 1)).to.equal("arweave.net/tx/public-uri-2v1");
        });

        it('Set multiple public uri', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0],
            ];
            await collectionStorage.addAssetBatch(asset);

            expect(await collectionStorage.uri(0, 0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await collectionStorage.uri(1, 0)).to.equal("arweave.net/tx/public-uri-1");

            var assetUri = [[0, "arweave.net/tx/public-uri-0v2"],[1, "arweave.net/tx/public-uri-1v2"]];
            await expect(collectionStorage.setPublicUriBatch(assetUri))
                .to.emit(collectionStorage, 'PublicUriUpdated');

            expect(await collectionStorage.uri(0, 1)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await collectionStorage.uri(1, 1)).to.equal("arweave.net/tx/public-uri-1v2"); 
        });

        it('Set multiple hidden uri', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0],
            ];
            await collectionStorage.addAssetBatch(asset);

            expect(await collectionStorage.hiddenUri(0, 0)).to.equal("arweave.net/tx/private-uri-0");
            expect(await collectionStorage.hiddenUri(1, 0)).to.equal("arweave.net/tx/private-uri-1");

            var assetUri = [[0, "arweave.net/tx/private-uri-0v2"],[1, "arweave.net/tx/private-uri-1v2"]];
            await expect(collectionStorage.setHiddenUriBatch(assetUri))
                .to.emit(collectionStorage, 'HiddenUriUpdated');

            expect(await collectionStorage.hiddenUri(0, 1)).to.equal("arweave.net/tx/private-uri-0v2");
            expect(await collectionStorage.hiddenUri(1, 1)).to.equal("arweave.net/tx/private-uri-1v2");
        });

        it('Set multiple token royalties', async () => {
            var asset = [
                ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 10, ethers.constants.AddressZero, 0],
                ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 1000, deployerAddress.address, 15000],
            ];
            await collectionStorage.addAssetBatch(asset);

            expect((await collectionStorage.getRoyalty(0)).rate).to.equal(20000);
            expect((await collectionStorage.getRoyalty(1)).rate).to.equal(10000);
            expect((await collectionStorage.getRoyalty(2)).rate).to.equal(15000);

            var tokenRoyalty = [
                [0, deployerAddress.address, 0], [1, deployerAddress.address, 30000], 
                [2, ethers.constants.AddressZero, 5]
            ];
            await expect(collectionStorage.setTokenRoyaltiesBatch(tokenRoyalty))
                .to.emit(collectionStorage, 'TokenRoyaltyUpdated');

            expect((await collectionStorage.getRoyalty(0)).rate).to.equal(0);
            expect((await collectionStorage.getRoyalty(1)).rate).to.equal(30000);
            expect((await collectionStorage.getRoyalty(2)).rate).to.equal(10000);
        });
    });


});
