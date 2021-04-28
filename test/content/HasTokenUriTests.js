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
        await testContract.__TestHasTokenUri_init("ipfs:/");
    });

    it('Check default Token Uri Prefix', async () => {
        assert.equal(
            await testContract.tokenUriPrefix(),
            "ipfs:/",
            "Token Uri Prefix isn't set properly.");
    });

    it('Empty Token Uri Prefix', async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init("");
        assert.equal(
            await testContract.tokenUriPrefix(),
            "",
            "Token Uri Prefix isn't empty.");
    });

    it('Update Token Uri Prefix', async () => {
        TruffleAssert.eventEmitted(
            await testContract.setTokenUriPrefix("ipns:/"),
            'TokenUriPrefixUpdated',
            (ev) => {
                return ev.uriPrefix == "ipns:/";
            }
        );

        assert.equal(
            await testContract.tokenUriPrefix(),
            "ipns:/",
            "Token Uri Prefix wasn't set properly.");
    });

    it('Check default Token Uris with just the prefix', async () => {
        assert.equal(
            await testContract.tokenUri(1),
            "ipfs:/1",
            "Token Uri Prefix isn't set properly.");
    });

    it('No Prefix and No token Uri', async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init("");

        assert.equal(
            await testContract.tokenUri(1),
            "",
            "Token Uri should be empty");
    });

    // AssetUri
    // {
    //     [
    //         tokenId,
    //         uri
    //     ]
    // }

    it('Set Token 1 with proper uri', async () => {
        var tokenUris = [[1, "ipfs:/testCID-1"]];
        TruffleAssert.eventEmitted(
            await testContract.setTokenUriBatch(tokenUris),
            'TokenDataUriUpdated',
            (ev) => {
                return ev.uri == "ipfs:/testCID-1";
            }
        );
        assert.equal(
            await testContract.tokenDataUri(1, 0),
            "ipfs:/testCID-1",
            "Token Data Uri isn't set properly.");
    });

    it('Set Multiple tokens with proper uri', async () => {
        var tokenUris = [[1, "ipfs:/testCID-1"], [2, "ipfs:/testCID-2"]];
        TruffleAssert.eventEmitted(
            await testContract.setTokenUriBatch(tokenUris),
            'TokenDataUriUpdated',
            (ev) => {
                return ev.id == 1 && ev.uri == "ipfs:/testCID-1";
            }
        );
        TruffleAssert.eventEmitted(
            await testContract.setTokenUriBatch(tokenUris),
            'TokenDataUriUpdated',
            (ev) => {
                return ev.id == 2 && ev.uri == "ipfs:/testCID-2";
            }
        );
    });

    it('Set Multiple tokens with the same id', async () => {
        var tokenUris = [[1, "ipfs:/testCID-1"], [1, "ipfs:/testCID-1v2"]];
        var results = await testContract.setTokenUriBatch(tokenUris);

        TruffleAssert.eventEmitted(
            results,
            'TokenDataUriUpdated',
            (ev) => {
                return ev.id == 1 
                && ev.version == 0
                && ev.uri == "ipfs:/testCID-1";
            }
        );
        TruffleAssert.eventEmitted(
            results,
            'TokenDataUriUpdated',
            (ev) => {
                return ev.id == 1
                    && ev.version == 1
                    && ev.uri == "ipfs:/testCID-1v2";
            }
        );
        
        // check the two versions
        assert.equal(
            await testContract.tokenDataUri(1, 0),
            "ipfs:/testCID-1",
            "Token Data Uri isn't set properly.");

        assert.equal(
            await testContract.tokenDataUri(1, 1),
            "ipfs:/testCID-1v2",
            "Token Data Uri isn't set properly.");
    });

    it('Token Uri with invalid version', async () => {
        var tokenUris = [[1, "ipfs:/testCID-1"], [1, "ipfs:/testCID-1v2"]];
        await testContract.setTokenUriBatch(tokenUris);

        // check latest version
        assert.equal(
            await testContract.tokenDataUri(1, 1),
            "ipfs:/testCID-1v2",
            "Token Uri isn't set properly for the correct version.");

        // check invalid version
        assert.equal(
            await testContract.tokenDataUri(1, 2),
            "ipfs:/testCID-1v2",
            "Latest Token Uri isn't properly returned.");
    });

    it('Get Latest version', async () => {
        var tokenUris = [[1, "ipfs:/testCID-1"], [1, "ipfs:/testCID-1v2"]];
        await testContract.setTokenUriBatch(tokenUris);

        // check latest version
        assert.equal(
            await testContract.getLatestUriVersion(1),
            1,
            "Incorrect latest version");
    });
    
    it('No prefix, single Token Uri', async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init("");

        var tokenUris = [[1, "ipfs:/testCID-1"]];
        await testContract.setTokenUriBatch(tokenUris);

        assert.equal(
            await testContract.tokenUri(1),
            "",
            "Incorrect Token Uri");
            
        assert.equal(
            await testContract.tokenDataUri(1, 1),
            "ipfs:/testCID-1",
            "Incorrect Token Uri with incorrect version.");
    });
    
    it('No prefix, multiple Token Uri', async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init("");

        var tokenUris = [[1, "ipfs:/testCID/1"], [2, "ipfs:/testCID/2"]];
        await testContract.setTokenUriBatch(tokenUris);

        assert.equal(
            await testContract.tokenDataUri(1, 0),
            "ipfs:/testCID/1",
            "Incorrect Token Uri");
            
        assert.equal(
            await testContract.tokenDataUri(2, 0),
            "ipfs:/testCID/2",
            "Incorrect Token Uri");
    });
    
    it('No prefix, multiple Token Uri, overwriting one token', async () => {
        testContract = await TestHasTokenUri.new();
        await testContract.__TestHasTokenUri_init("");

        var tokenUris = [[1, "ipfs:/testCID/1"], [2, "ipfs:/testCID/2"], [1, "ipfs:/testCID/A"]];
        await testContract.setTokenUriBatch(tokenUris);

        assert.equal(
            await testContract.tokenDataUri(1, 0),
            "ipfs:/testCID/1",
            "Incorrect Token Uri");
            
        assert.equal(
            await testContract.tokenDataUri(1, 1),
            "ipfs:/testCID/A",
            "Incorrect Token Uri");

        assert.equal(
            await testContract.tokenDataUri(2, 0),
            "ipfs:/testCID/2",
            "Incorrect Token Uri");
    });
});
