const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('HasRoyalty Contract Tests', () => {
    var testContract;
    var deployerAddress, deployerAltAddress;
    var TestHasRoyalty;

    before(async () => {
        [deployerAddress, deployerAltAddress] = await ethers.getSigners();
        TestHasRoyalty = await ethers.getContractFactory("TestHasRoyalty");
    });

    beforeEach(async () => {
        testContract = await upgrades.deployProxy(TestHasRoyalty, [deployerAddress.address, 10000]);
    });

    describe("Contract Royalty", () => {
        it('Check contract royalties', async () => {
            var contractFees = await testContract.getRoyalty(0);

            expect(contractFees.receiver).to.equal(deployerAddress.address);
            expect(contractFees.rate).to.equal(10000);
        });
        
        it('Set No Contract Royalties', async () => {
            testContract = await upgrades.deployProxy(TestHasRoyalty, [deployerAddress.address, 0]);

            var contractFees = await testContract.getRoyalty(0);
            expect(contractFees.rate).to.equal(0);
        });
        
        it('Set Delete Contract Royalties', async () => {
            await expect(testContract.setContractRoyalty(deployerAddress.address, 0))
                .to.emit(testContract, 'ContractRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, deployerAddress.address, 0);

            var tokenFees = await testContract.getRoyalty(0);
            expect(tokenFees.rate).to.equal(0);
        });

        it('Set Update Contract Royalties', async () => {

            await expect(testContract.setContractRoyalty(deployerAddress.address, 20000))
                .to.emit(testContract, 'ContractRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, deployerAddress.address, 20000);

            var tokenFees = await testContract.getRoyalty(0);
            expect(tokenFees.rate).to.equal(20000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
        });
        
        it('Contract royalty rate too high', async () => {
            await expect(testContract.setContractRoyalty(deployerAddress.address, 200001)).to.be.reverted;
        });

        it('Invalid contract royalty receiver address', async () => {
            await expect(testContract.setContractRoyalty(ethers.constants.AddressZero, 10000)).to.be.reverted;
        });

    });

    describe("Token Royalty", () => {
        // Note that we are not doing ID checks in HasRoyalty contract. That should be done 
        // in the contract inheriting HasRoyalty

        // Asset Royalties:
        // { 
        //     tokenId,
        //     [{
                
        //         account,
        //         rate
        //     }]
        // }

        it('Add royalty to Token ID 1', async () => {
            var assetRoyalty = [[1, deployerAddress.address, 20000]];
            var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, deployerAddress.address, 20000);
            
            // token royalty from contract royalty
            var tokenFees = await testContract.getRoyalty(0);
            expect(tokenFees.rate).to.equal(10000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);

            // token royalty from unique token royalty
            tokenFees = await testContract.getRoyalty(1);
            expect(tokenFees.rate).to.equal(20000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
        });
        

        it('Add royalty to Token ID 1 and 2', async () => {
            var assetRoyalty = [[1, deployerAddress.address, 20000], [2, deployerAltAddress.address, 20000]];
            var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            // filter for token 1
            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, deployerAddress.address, 20000);
                
            // filter for token 2
            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 2, deployerAltAddress.address, 20000);
        });

        it('Set royalty to Token ID 1 and then reset royalty to zero', async () => {
            // Set token 1 royalties
            var assetRoyalty = [[1, deployerAddress.address, 20000]];
            await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            // Delete Token 1 Royalties
            var assetRoyalty = [[1, deployerAddress.address, 0]];
            var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            // check emitted event
            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, deployerAddress.address, 0);
            
            // check token royalty
            tokenFees = await testContract.getRoyalty(1);
            expect(tokenFees.rate).to.equal(0);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
        });

        it('Token royalty rate too high', async () => {
            var assetRoyalty = [[1, deployerAddress.address, 200001]];
            await expect(testContract.setTokenRoyaltiesBatch(assetRoyalty)).to.be.reverted;
        });

        it('Zero address token receiver address', async () => {
            var assetRoyalty = [[1, ethers.constants.AddressZero, 30000]];
            var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(ethers.constants.AddressZero, 1, ethers.constants.AddressZero, 30000);
            
            // Should revert to using contract royalty
            tokenFees = await testContract.getRoyalty(1);
            expect(tokenFees.rate).to.equal(10000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
        });
        
    });

});
