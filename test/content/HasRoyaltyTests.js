const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { constants } = require('@openzeppelin/test-helpers');

describe('HasRoyalty Contract Tests', () => {
    // const [
    //     deployerAddress,            // Address that deployed contracts
    //     deployerAltAddress,         // Alternate deployer address
    // ] = accounts;
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
                .withArgs(constants.ZERO_ADDRESS, deployerAddress.address, 0);

            var tokenFees = await testContract.getRoyalty(0);
            expect(tokenFees.rate).to.equal(0);
        });

        it('Set Update Contract Royalties', async () => {

            await expect(testContract.setContractRoyalty(deployerAddress.address, 20000))
                .to.emit(testContract, 'ContractRoyaltyUpdated')
                .withArgs(constants.ZERO_ADDRESS, deployerAddress.address, 20000);

            var tokenFees = await testContract.getRoyalty(0);
            expect(tokenFees.rate).to.equal(20000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
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
                .withArgs(constants.ZERO_ADDRESS, 1, deployerAddress.address, 20000);
            
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
                .withArgs(constants.ZERO_ADDRESS, 1, deployerAddress.address, 20000);
                
            // filter for token 2
            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(constants.ZERO_ADDRESS, 2, deployerAltAddress.address, 20000);
        });

        it('Set Royalty to Token Id 1 and then revert to using Contract Royalty', async () => {
            // Set token 1 royalties
            var assetRoyalty = [[1, deployerAddress.address, 20000]];
            await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            // Delete Token 1 Royalties
            var assetRoyalty = [[1, deployerAddress.address, 0]];
            var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

            // check emitted event
            expect(results)
                .to.emit(testContract, 'TokenRoyaltyUpdated')
                .withArgs(constants.ZERO_ADDRESS, 1, deployerAddress.address, 0);
            
            // check token royalty
            tokenFees = await testContract.getRoyalty(1);
            expect(tokenFees.rate).to.equal(0);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
        });
    });

});
