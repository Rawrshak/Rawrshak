const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('HasTokenUri Contract Tests', () => {
    var testContract;

    beforeEach(async () => {
        const TestHasTokenUri = await ethers.getContractFactory("TestHasTokenUri");
        testContract = await upgrades.deployProxy(TestHasTokenUri, []); 
    });

    describe("Invalid function calls", () => {
        it('Check no public or hidden token Uris with just the prefix', async () => {
            await expect(testContract.tokenUri(1, 0, true)).to.be.reverted;
            await expect(testContract.tokenUri(1, 0, false)).to.be.reverted;
        });
    });

    describe("URI", () => {

        // AssetUri
        // {
        //     [
        //         tokenId,
        //         uri
        //     ]
        // }
    
        it('Set Token 1 with proper uri', async () => {
            var tokenUris = [[1, "arweave.net/tx/hiddentoken"]];

            await expect(testContract.setHiddenUri(tokenUris))
                .to.emit(testContract, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);

            tokenUris = [[1, "arweave.net/tx/publictoken"]];
            await expect(testContract.setPublicUri(tokenUris))
                .to.emit(testContract, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);

            expect(await testContract.tokenUri(1, 0, true))
                .to.equal("arweave.net/tx/publictoken");
    
            expect(await testContract.tokenUri(1, 0, false))
                .to.equal("arweave.net/tx/hiddentoken");
        });
        
        it('Set Multiple tokens with proper uri', async () => {
            // Set Private Token Uri
            var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [2, "arweave.net/tx/hiddentoken-2"]];
            
            // Set Hidden URI and test emitted events
            var events = await testContract.setHiddenUri(tokenUris);
            expect(events)
                .to.emit(testContract, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            expect(events)
                .to.emit(testContract, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 2, 0);
                
            expect(await testContract.tokenUri(1, 0, false))
                .to.equal("arweave.net/tx/hiddentoken-1");
            
            expect(await testContract.tokenUri(2, 0, false))
                .to.equal("arweave.net/tx/hiddentoken-2");

            // Set Public Token Uri and test emitted events
            tokenUris = [[1, "arweave.net/tx/publictoken-1"], [2, "arweave.net/tx/publictoken-2"]];
            var events = await testContract.setPublicUri(tokenUris);
            expect(events)
                .to.emit(testContract, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            expect(events)
                .to.emit(testContract, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 2, 0);
                
            expect(await testContract.tokenUri(1, 0, true))
                .to.equal("arweave.net/tx/publictoken-1");
            
            expect(await testContract.tokenUri(2, 0, true))
                .to.equal("arweave.net/tx/publictoken-2");
        });

        it('Set Multiple tokens with the same id for private uri', async () => {
            var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
            var events = await testContract.setHiddenUri(tokenUris);
    
            expect(events)
                .to.emit(testContract, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            expect(events)
                .to.emit(testContract, 'HiddenUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 1);
            
            // check the two versions
            expect(await testContract.tokenUri(1, 0, false))
                .to.equal("arweave.net/tx/hiddentoken-1");
            expect(await testContract.tokenUri(1, 1, false))
                .to.equal("arweave.net/tx/hiddentoken-1v2");
        });
            
        it('Set Multiple tokens with the same id for public uri', async () => {
            var tokenUris = [[1, "arweave.net/tx/publictoken-1"], [1, "arweave.net/tx/publictoken-1v2"]];
            var events = await testContract.setPublicUri(tokenUris);
    
            expect(events)
                .to.emit(testContract, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 0);
            expect(events)
                .to.emit(testContract, 'PublicUriUpdated')
                .withArgs(ethers.constants.AddressZero, 1, 1);
            
            // check the two versions
            expect(await testContract.tokenUri(1, 0, true))
                .to.equal("arweave.net/tx/publictoken-1");
            expect(await testContract.tokenUri(1, 1, true))
                .to.equal("arweave.net/tx/publictoken-1v2");
        });

        it('Token Uri with invalid version for private uri', async () => {
            var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
            await testContract.setHiddenUri(tokenUris);
    
            // check latest version
            expect(await testContract.tokenUri(1, 1, false))
                .to.equal("arweave.net/tx/hiddentoken-1v2");
    
            // check invalid version
            expect(await testContract.tokenUri(1, 2, false))
                .to.equal("arweave.net/tx/hiddentoken-1v2");
        });

        it('Token Uri with invalid version for public uri', async () => {
            var tokenUris = [[1, "arweave.net/tx/publictoken-1"], [1, "arweave.net/tx/publictoken-1v2"]];
            await testContract.setPublicUri(tokenUris);
    
            // check latest version
            expect(await testContract.tokenUri(1, 1, true))
                .to.equal("arweave.net/tx/publictoken-1v2");
    
            // check invalid version
            expect(await testContract.tokenUri(1, 2, true))
                .to.equal("arweave.net/tx/publictoken-1v2");
        });
    });

    describe("Latest URI Version", () => {
        it('Get Latest Hidden Uri version', async () => {
            var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
            await testContract.setHiddenUri(tokenUris);
    
            // check latest version for hidden token uri
            expect(await testContract.getLatestUriVersion(1, false))
                .to.equal(1);
                
            // check latest version for public token uri
            expect(await testContract.getLatestUriVersion(1, true))
                .to.equal(0);
        });

        it('Get Latest Public Uri version', async () => {
            var tokenUris = [[1, "arweave.net/tx/publictoken-1"], [1, "arweave.net/tx/publictoken-1v2"]];
            await testContract.setPublicUri(tokenUris);
    
            // check latest version for hidden token uri
            expect(await testContract.getLatestUriVersion(1, false))
                .to.equal(0);
                
            // check latest version for public token uri
            expect(await testContract.getLatestUriVersion(1, true))
                .to.equal(1);
        }); 
    });
});