const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('ContentStorage Contract Tests', () => {
    var ContentStorage;
    var contentStorage;
    var deployerAddress, playerAddress;

    before(async () => {
        [deployerAddress, playerAddress] = await ethers.getSigners();
        ContentStorage = await ethers.getContractFactory("ContentStorage");
    });

    beforeEach(async () => {
        contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
    });

    describe("Basic Tests", () => {
        it('Check Content Storage proper deployment', async () => {
            // Check Contract Royalties
            var contractFees = await contentStorage.getRoyalty(0);
            expect(contractFees.receiver).to.equal(deployerAddress.address);
            expect(contractFees.rate).to.equal(10000);
        });
        
        it('Check StorageContract Interfaces', async () => {
            // Content Storage interface
            expect(await contentStorage.supportsInterface("0xA133AF9C")).to.equal(true);
                
            // HasContractUri interface
            expect(await contentStorage.supportsInterface("0xc0e24d5e")).to.equal(true);
        });
    
        it('Check role permissions', async () => {
            var default_admin_role = await contentStorage.DEFAULT_ADMIN_ROLE();
    
            expect(await contentStorage.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
            expect(await contentStorage.hasRole(default_admin_role, playerAddress.address)).to.equal(false);
        });
    });
    
    describe("Assets Info", () => {
        // CreateData
        // {
        //     tokenId,
        //     dataUri,
        //     maxSupply,
        //     [
        //         {
        //             account,
        //             rate
        //         }
        //     ]
        // }
    
        it('Add single asset', async () => {
            var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1",  100, deployerAddress.address, 20000]];
            var results = await contentStorage.addAssetBatch(asset);
    
            await expect(results)
                .to.emit(contentStorage, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, deployerAddress.address, 20000);

            await expect(results)
                .to.emit(contentStorage, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
                
            await expect(results)
                .to.emit(contentStorage, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            
            expect(await contentStorage.ids(1))
                .to.equal(true);
            expect(await contentStorage.supply(1))
                .to.equal(0);
            expect(await contentStorage.maxSupply(1))
                .to.equal(100);
        });

        it('Add multiple assets', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0]
            ];
            var results = await contentStorage.addAssetBatch(asset);
    
            // Check the token URIs
            await expect(results)
                .to.emit(contentStorage, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            
            await expect(results)
                .to.emit(contentStorage, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 2, 0);

            await expect(results)
                .to.emit(contentStorage, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, deployerAddress.address, 20000);
        });
    });
    
    describe("Contract Interactions", () => {
        
        it('Update the current asset supply', async () => {
            var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, deployerAddress.address, 20000]];
            await contentStorage.addAssetBatch(asset);

            expect(await contentStorage.supply(1))
                .to.equal(0);

            await contentStorage.updateSupply(1, 5); 

            expect(await contentStorage.supply(1))
                .to.equal(5);
        });
        
        it('Basic Royalties tests', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0],
                [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 10, deployerAddress.address, 30000]
            ];
            await contentStorage.addAssetBatch(asset);

            tokenFees = await contentStorage.getRoyalty(1);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(20000);
                
            tokenFees = await contentStorage.getRoyalty(2);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(10000);
                
            tokenFees = await contentStorage.getRoyalty(3);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(30000);
        });

        it('Basic Uri tests', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0],
                [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 10, ethers.constants.AddressZero, 0]
            ];
            await contentStorage.addAssetBatch(asset);

            // Test Public Uri
            expect(await contentStorage.uri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await contentStorage.uri(2, 0)).to.equal("arweave.net/tx/public-uri-2");
            expect(await contentStorage.uri(3, 0)).to.equal("arweave.net/tx/public-uri-3");
                
            // Test Hidden Uri
            expect(await contentStorage.hiddenUri(1, 0)).to.equal("arweave.net/tx/private-uri-1");
            expect(await contentStorage.hiddenUri(2, 0)).to.equal("arweave.net/tx/private-uri-2");
            expect(await contentStorage.hiddenUri(3, 0)).to.equal("arweave.net/tx/private-uri-3");
                
            // Update Asset 2
            var assetUri = [
                [2, "arweave.net/tx/private-uri-2v1"]
            ];
            
            await expect(contentStorage.setHiddenUriBatch(assetUri))
                .to.emit(contentStorage, 'HiddenUriUpdated');
            
            expect(await contentStorage.hiddenUri(2, 1)).to.equal("arweave.net/tx/private-uri-2v1");
                
            // Update Asset 3
            var assetUri = [
                [3, "arweave.net/tx/public-uri-3v1"]
            ];
            
            await expect(contentStorage.setPublicUriBatch(assetUri))
                .to.emit(contentStorage, 'PublicUriUpdated');
                
            expect(await contentStorage.uri(3, 1)).to.equal("arweave.net/tx/public-uri-3v1");
        });
    });


});
