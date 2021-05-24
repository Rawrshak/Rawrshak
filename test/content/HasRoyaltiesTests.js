const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestHasRoyalties = artifacts.require("TestHasRoyalties")
const TruffleAssert = require("truffle-assertions");

contract('HasRoyalties Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestHasRoyalties.new();
        var contractFees = [[deployerAddress, 100]];
        await testContract.__TestHasRoyalties_init(contractFees);
    });

    it('Check contract royalties', async () => {
        var contractFees = await testContract.getRoyalties(0);

        assert.equal(
            contractFees.length,
            1,
            "There should only be 1 royalty fee.");
        assert.equal(
            contractFees[0].account,
            deployerAddress,
            "Royalty address should be the deployer.");
        assert.equal(
            contractFees[0].rate,
            100,
            "Royalty rate is incorrect.");
    });

    it('Set Mutliple Contract Royalties', async () => {
        testContract = await TestHasRoyalties.new();
        var defaultContractFees = [[deployerAddress, 100], [deployerAltAddress, 200]];
        await testContract.__TestHasRoyalties_init(defaultContractFees);

        var contractFees = await testContract.getRoyalties(0);

        assert.equal(
            contractFees.length,
            2,
            "There should be multiple royalty fees");

        assert.equal(
            contractFees[0].account == deployerAddress && contractFees[0].rate == 100,
            true,
            "First royalty fee should be the deployer.");
        assert.equal(
            contractFees[1].account == deployerAltAddress && contractFees[1].rate == 200,
            true,
            "Second Royalty fee should be the deployer's alternate wallet.");
    });

    it('Set No Contract Royalties', async () => {
        testContract = await TestHasRoyalties.new();
        var defaultContractFees = [];
        await testContract.__TestHasRoyalties_init(defaultContractFees);

        var contractFees = await testContract.getRoyalties(0);

        assert.equal(
            contractFees.length,
            0,
            "There should be no royalty fees");
    });

    it('Set Delete Contract Royalties', async () => {
        contractFees = [];
        TruffleAssert.eventEmitted(
            await testContract.setContractRoyalties(contractFees),
            'ContractRoyaltiesUpdated',
            (ev) => {
                return ev.fees.length == 0;
            }
        );

        var tokenFees = await testContract.getRoyalties(0);

        assert.equal(
            tokenFees.length,
            0,
            "There shouldn't be any token or contract royalties.");
    });

    it('Set Update Contract Royalties', async () => {
        contractFees = [[deployerAddress, 200]];
        TruffleAssert.eventEmitted(
            await testContract.setContractRoyalties(contractFees),
            'ContractRoyaltiesUpdated',
            (ev) => {
                return ev.fees[0].account == deployerAddress
                    && ev.fees[0].rate == 200;
            }
        );

        var tokenFees = await testContract.getRoyalties(0);

        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == 200,
            true,
            "Token Royalty should reflect new contract royalties.");
    });

    // Note that we are not doing ID checks in HasRoyalties contract. That should be done 
    // in the contract inheriting HasRoyalties

    // Asset Royalties:
    // { 
    //     tokenId,
    //     [{
            
    //         account,
    //         rate
    //     }]
    // }
    it('Add royalty to Token ID 1', async () => {
        var assetRoyalty = [[1, [[deployerAddress, 200]]]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.fees[0].account == deployerAddress
                    && ev.fees[0].rate == 200;
            }
        );

        var tokenFees = await testContract.getRoyalties(0);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == 100,
            true,
            "Token 0 royalties should reflect the contract royalties.");

        tokenFees = await testContract.getRoyalties(1);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == 200,
            true,
            "Token 1 royalties should reflect the new Token 1 royalties.");
    });
    

    it('Add royalty to Token ID 1 and 2', async () => {
        var assetRoyalty = [[1, [[deployerAddress, 200]]], [2, [[deployerAltAddress, 200]]]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);

        // filter for token 1
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.fees[0].account == deployerAddress
                    && ev.fees[0].rate == 200;
            }
        );

        // filter for token 2
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 2
                    && ev.fees[0].account == deployerAltAddress
                    && ev.fees[0].rate == 200;
            }
        );
    });

    it('Set Royalty to Token Id 1 and then revert to using Contract Royalty', async () => {
        // Set token 1 royalties
        var assetRoyalty = [[1, [[deployerAddress, 200]]]];
        await testContract.setTokenRoyaltiesBatch(assetRoyalty);

        // Delete Token 1 Royalties
        var assetRoyalty = [[1, []]];
        var results = await testContract.setTokenRoyaltiesBatch(assetRoyalty);
        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.fees.length == 0;
            }
        );
        
        tokenFees = await testContract.getRoyalties(1);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == 100,
            true,
            "Token 1 royalties should reflect the contract royalties.");
    });
});
