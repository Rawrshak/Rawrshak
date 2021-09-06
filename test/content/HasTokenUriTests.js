const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestHasTokenUri = artifacts.require("TestHasTokenUri")
const TruffleAssert = require("truffle-assertions");

contract('HasTokenUri Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init();
    });

    it('Check no public or hidden token Uris with just the prefix', async () => {
        await TruffleAssert.fails(
            testContract.tokenUri(1, 0, true),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            testContract.tokenUri(1, 0, false),
            TruffleAssert.ErrorType.REVERT
        );
    });

    // AssetUri
    // {
    //     [
    //         tokenId,
    //         uri
    //     ]
    // }

    it('Set Token 1 with proper uri', async () => {
        var tokenUris = [[1, "arweave.net/tx/hiddentoken"]];
        TruffleAssert.eventEmitted(
            await testContract.setHiddenUri(tokenUris),
            'HiddenUriUpdated',
            (ev) => {
                return ev.id == 1;
            }
        );
        
        tokenUris = [[1, "arweave.net/tx/publictoken"]];
        TruffleAssert.eventEmitted(
            await testContract.setPublicUri(tokenUris),
            'PublicUriUpdated',
            (ev) => {
                return ev.id == 1;
            }
        );
        assert.equal(
            await testContract.tokenUri(1, 0, true),
            "arweave.net/tx/publictoken",
            "Public Token Data Uri isn't set properly.");
        assert.equal(
            await testContract.tokenUri(1, 0, false),
            "arweave.net/tx/hiddentoken",
            "Hidden Token Data Uri isn't set properly.");
    });

    it('Set Multiple tokens with proper uri', async () => {
        // Set Private Token Uri
        var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [2, "arweave.net/tx/hiddentoken-2"]];
        TruffleAssert.eventEmitted(
            await testContract.setHiddenUri(tokenUris),
            'HiddenUriUpdated',
            (ev) => {
                return ev.id == 1;
            }
        );
        TruffleAssert.eventEmitted(
            await testContract.setHiddenUri(tokenUris),
            'HiddenUriUpdated',
            (ev) => {
                return ev.id == 2;
            }
        );
        assert.equal(
            await testContract.tokenUri(1, 0, false),
            "arweave.net/tx/hiddentoken-1",
            "Hidden Token Data Uri isn't set properly.");
        assert.equal(
            await testContract.tokenUri(2, 0, false),
            "arweave.net/tx/hiddentoken-2",
            "Hidden Token Data Uri isn't set properly.");

        // Set Public Token Uri
        var tokenUris = [[1, "arweave.net/tx/publictoken-1"], [2, "arweave.net/tx/publictoken-2"]];
        TruffleAssert.eventEmitted(
            await testContract.setPublicUri(tokenUris),
            'PublicUriUpdated',
            (ev) => {
                return ev.id == 1;
            }
        );
        TruffleAssert.eventEmitted(
            await testContract.setPublicUri(tokenUris),
            'PublicUriUpdated',
            (ev) => {
                return ev.id == 2;
            }
        );
        assert.equal(
            await testContract.tokenUri(1, 0, true),
            "arweave.net/tx/publictoken-1",
            "Public Token Data Uri isn't set properly.");
        assert.equal(
            await testContract.tokenUri(2, 0, true),
            "arweave.net/tx/publictoken-2",
            "Public Token Data Uri isn't set properly.");
    });

    it('Set Multiple tokens with the same id', async () => {
        var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
        var results = await testContract.setHiddenUri(tokenUris);

        TruffleAssert.eventEmitted(
            results,
            'HiddenUriUpdated',
            (ev) => {
                return ev.id == 1 
                && ev.version == 0;
            }
        );
        TruffleAssert.eventEmitted(
            results,
            'HiddenUriUpdated',
            (ev) => {
                return ev.id == 1
                    && ev.version == 1;
            }
        );
        
        // check the two versions
        assert.equal(
            await testContract.tokenUri(1, 0, false),
            "arweave.net/tx/hiddentoken-1",
            "Token Data Uri isn't set properly.");

        assert.equal(
            await testContract.tokenUri(1, 1, false),
            "arweave.net/tx/hiddentoken-1v2",
            "Token Data Uri isn't set properly.");
    });

    it('Token Uri with invalid version', async () => {
        var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
        await testContract.setHiddenUri(tokenUris);

        // check latest version
        assert.equal(
            await testContract.tokenUri(1, 1, false),
            "arweave.net/tx/hiddentoken-1v2",
            "Token Uri isn't set properly for the correct version.");

        // check invalid version
        assert.equal(
            await testContract.tokenUri(1, 2, false),
            "arweave.net/tx/hiddentoken-1v2",
            "Latest Token Uri isn't properly returned.");
    });

    it('Get Latest version', async () => {
        var tokenUris = [[1, "arweave.net/tx/hiddentoken-1"], [1, "arweave.net/tx/hiddentoken-1v2"]];
        await testContract.setHiddenUri(tokenUris);

        // check latest version for hidden token uri
        assert.equal(
            await testContract.getLatestUriVersion(1, false),
            1,
            "Incorrect hidden latest version");
            
        // check latest version for public token uri
        assert.equal(
            await testContract.getLatestUriVersion(1, true),
            0,
            "Incorrect public latest version");
    }); 
});