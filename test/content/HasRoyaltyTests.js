const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestHasRoyalty = artifacts.require("TestHasRoyalty")
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('HasRoyalty Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestHasRoyalty.new();
        await testContract.__TestHasRoyalty_init(deployerAddress, 10000);
    });

    it('Check contract royalties', async () => {
        var contractFees = await testContract.getRoyalty(0);

        assert.equal(
            contractFees.receiver,
            deployerAddress,
            "Royalty address should be the deployer.");
        assert.equal(
            contractFees.rate,
            10000,
            "Royalty rate is incorrect.");
    });

    it('Set No Contract Royalties', async () => {
        testContract = await TestHasRoyalty.new();
        await testContract.__TestHasRoyalty_init(deployerAddress, 0);

        var contractFees = await testContract.getRoyalty(0);

        assert.equal(
            contractFees.rate,
            0,
            "There should be no royalty fees");
    });

    it('Set Delete Contract Royalties', async () => {
        TruffleAssert.eventEmitted(
            await testContract.setContractRoyalty(deployerAddress, 0),
            'ContractRoyaltyUpdated',
            (ev) => {
                return ev.rate == 0;
            }
        );

        var tokenFees = await testContract.getRoyalty(0);
        assert.equal(
            tokenFees.rate,
            0,
            "There should be no royalty fees");
    });

    it('Set Update Contract Royalties', async () => {
        TruffleAssert.eventEmitted(
            await testContract.setContractRoyalty(deployerAddress, 20000),
            'ContractRoyaltyUpdated',
            (ev) => {
                return ev.receiver == deployerAddress
                    && ev.rate == 20000;
            }
        );

        var tokenFees = await testContract.getRoyalty(0);

        assert.equal(
            tokenFees.receiver == deployerAddress && tokenFees.rate == 20000,
            true,
            "Token Royalty should reflect new contract royalties.");
    });

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
        var assetRoyalty = [[1, deployerAddress, 20000]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltyUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.receiver == deployerAddress
                    && ev.rate == 20000;
            }
        );

        var tokenFees = await testContract.getRoyalty(0);
        assert.equal(
            tokenFees.receiver == deployerAddress && tokenFees.rate == 10000,
            true,
            "Token 0 royalties should reflect the contract royalties.");

        tokenFees = await testContract.getRoyalty(1);
        assert.equal(
            tokenFees.receiver == deployerAddress && tokenFees.rate == 20000,
            true,
            "Token 1 royalties should reflect the new Token 1 royalties.");
    });
    

    it('Add royalty to Token ID 1 and 2', async () => {
        var assetRoyalty = [[1, deployerAddress, 20000], [2, deployerAltAddress, 20000]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

        // filter for token 1
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltyUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.receiver == deployerAddress
                    && ev.rate == 20000;
            }
        );

        // filter for token 2
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltyUpdated',
            (ev) => {
                return ev.tokenId.toString() == 2
                    && ev.receiver == deployerAltAddress
                    && ev.rate == 20000;
            }
        );
    });

    it('Set Royalty to Token Id 1 and then revert to using Contract Royalty', async () => {
        // Set token 1 royalties
        var assetRoyalty = [[1, deployerAddress, 20000]];
        await testContract.setTokenRoyaltiesBatch(assetRoyalty);

        // Delete Token 1 Royalties
        var assetRoyalty = [[1, deployerAddress, 0]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltyUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.rate == 0;
            }
        );
        
        tokenFees = await testContract.getRoyalty(1);
        assert.equal(
            tokenFees.receiver == deployerAddress && tokenFees.rate == 0,
            true,
            "Token 1 royalties should reflect the contract royalties.");
    });
});
