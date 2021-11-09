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
        
        it('Check ContentStorage Contract Interfaces', async () => {
            // IContentStorage Interface
            expect(await contentStorage.supportsInterface("0xac73f1f1")).to.equal(true);

            // IContentSubsystemBase Interface
            expect(await contentStorage.supportsInterface("0x7460af1d")).to.equal(true);
                
            // IContractUri interface
            expect(await contentStorage.supportsInterface("0xc0e24d5e")).to.equal(true);

            // IAccessControlUpgradeable Interface
            expect(await contentStorage.supportsInterface("0x7965db0b")).to.equal(true);
        });
    
        it('Check role permissions', async () => {
            var default_admin_role = await contentStorage.DEFAULT_ADMIN_ROLE();
    
            expect(await contentStorage.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
            expect(await contentStorage.hasRole(default_admin_role, playerAddress.address)).to.equal(false);
        });

        it('Unauthorized caller', async () => {
            var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1",  100, deployerAddress.address, 20000]];
            await contentStorage.addAssetBatch(asset);

            await expect(contentStorage.connect(playerAddress).updateSupply(1, 50)).to.be.reverted;
            await expect(contentStorage.connect(playerAddress).setPublicUriBatch([[1, ""]])).to.be.reverted;
            await expect(contentStorage.connect(playerAddress).setHiddenUriBatch([[1, ""]])).to.be.reverted;
            await expect(contentStorage.connect(playerAddress).setContractRoyalty(playerAddress.address, 1000000)).to.be.reverted;
            await expect(contentStorage.connect(playerAddress).setTokenRoyaltiesBatch([[1, playerAddress.address, 500000]])).to.be.reverted;
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
            
            await expect(results)
                .to.emit(contentStorage, 'AssetsAdded');
            
            expect(await contentStorage.ids(1))
                .to.equal(true);
            expect(await contentStorage.supply(1))
                .to.equal(0);
            expect(await contentStorage.maxSupply(1))
                .to.equal(100);
            
            tokenFees = await contentStorage.getRoyalty(1);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.rate).to.equal(20000);
            
            expect(await contentStorage.uri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await contentStorage.hiddenUri(1, 0)).to.equal("arweave.net/tx/private-uri-1");
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
            
            await expect(results)
                .to.emit(contentStorage, 'AssetsAdded');
            
            expect(await contentStorage.ids(2))
                .to.equal(true);
            expect(await contentStorage.supply(1))
                .to.equal(0);
            expect(await contentStorage.maxSupply(2))
                .to.equal(10);
        });

        it('Add mutliple assets, one with invalid fee', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 1000, deployerAddress.address, 2000000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, deployerAddress.address, 0]
            ];
            await expect(contentStorage.addAssetBatch(asset)).to.be.reverted;
        });

        it('Add an already existing token', async () => {
            var asset1 = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000]];
            await contentStorage.addAssetBatch(asset1);

            var asset2 = [
                [1, "arweave.net/tx/public-uri-1v2", "arweave.net/tx/private-uri-1v2", 1, deployerAddress.address, 30000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, ethers.constants.AddressZero, 0],
                [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 0, deployerAddress.address, 1000000]
            ];
            await expect(contentStorage.addAssetBatch(asset2)).to.be.reverted;
            
            expect(await contentStorage.ids(2)).to.equal(false);
            expect(await contentStorage.ids(3)).to.equal(false);
        });

        it('Set max supply to zero', async () => {
            var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1",  0, deployerAddress.address, 30000]];
            var results = await contentStorage.addAssetBatch(asset);
    
            expect(await contentStorage.maxSupply(1))
                .to.equal(ethers.constants.MaxUint256);
        });
    });
    
    describe("Contract Interactions", () => {
        
        it('Update the current asset supply', async () => {
            var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, deployerAddress.address, 20000]];
            await contentStorage.addAssetBatch(asset);

            expect(await contentStorage.supply(1)).to.equal(0);

            await contentStorage.updateSupply(1, 5); 

            expect(await contentStorage.supply(1)).to.equal(5);
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

        it('Set multiple public uri', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0],
            ];
            await contentStorage.addAssetBatch(asset);

            expect(await contentStorage.uri(1, 0)).to.equal("arweave.net/tx/public-uri-1");
            expect(await contentStorage.uri(2, 0)).to.equal("arweave.net/tx/public-uri-2");

            var assetUri = [[1, "arweave.net/tx/public-uri-1v2"],[2, "arweave.net/tx/public-uri-2v2"]];
            await expect(contentStorage.setPublicUriBatch(assetUri))
                .to.emit(contentStorage, 'PublicUriUpdated');

            expect(await contentStorage.uri(1, 1)).to.equal("arweave.net/tx/public-uri-1v2");
            expect(await contentStorage.uri(2, 1)).to.equal("arweave.net/tx/public-uri-2v2"); 
        });

        it('Set multiple hidden uri', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0],
            ];
            await contentStorage.addAssetBatch(asset);

            expect(await contentStorage.hiddenUri(1, 0)).to.equal("arweave.net/tx/private-uri-1");
            expect(await contentStorage.hiddenUri(2, 0)).to.equal("arweave.net/tx/private-uri-2");

            var assetUri = [[1, "arweave.net/tx/private-uri-1v2"],[2, "arweave.net/tx/private-uri-2v2"]];
            await expect(contentStorage.setHiddenUriBatch(assetUri))
                .to.emit(contentStorage, 'HiddenUriUpdated');

            expect(await contentStorage.hiddenUri(1, 1)).to.equal("arweave.net/tx/private-uri-1v2");
            expect(await contentStorage.hiddenUri(2, 1)).to.equal("arweave.net/tx/private-uri-2v2");
        });

        it('Set multiple token royalties', async () => {
            var asset = [
                [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
                [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, ethers.constants.AddressZero, 0],
                [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 1000, deployerAddress.address, 15000],
            ];
            await contentStorage.addAssetBatch(asset);

            expect((await contentStorage.getRoyalty(1)).rate).to.equal(20000);
            expect((await contentStorage.getRoyalty(2)).rate).to.equal(10000);
            expect((await contentStorage.getRoyalty(3)).rate).to.equal(15000);

            var tokenRoyalty = [[1, deployerAddress.address, 0], [2, deployerAddress.address, 30000], 
            [3, ethers.constants.AddressZero, 5]];
            await expect(contentStorage.setTokenRoyaltiesBatch(tokenRoyalty))
                .to.emit(contentStorage, 'TokenRoyaltyUpdated');

            expect((await contentStorage.getRoyalty(1)).rate).to.equal(0);
            expect((await contentStorage.getRoyalty(2)).rate).to.equal(30000);
            expect((await contentStorage.getRoyalty(3)).rate).to.equal(10000);
        });
    });


});
