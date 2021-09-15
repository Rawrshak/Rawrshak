const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const ContentStorage = artifacts.require("ContentStorage");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('ContentStorage Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var contentStorage;

    beforeEach(async () => {
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
    });

    it('Check Content Storage proper deployment', async () => {
        // Check Contract Royalties
        var contractFees = await contentStorage.getRoyalties(0);
        assert.equal(
            contractFees[0].account == deployerAddress && contractFees[0].rate == web3.utils.toWei('0.01', 'ether'),
            true,
            "Royalty address should be the deployer.");
    });
    
    it('Check StorageContract Interfaces', async () => {
        // Content Storage interface
        assert.equal(
            await contentStorage.supportsInterface("0xA133AF9C"),
            true, 
            "the token doesn't support the ContentStorage interface");
            
        // HasContractUri interface
        assert.equal(
            await contentStorage.supportsInterface("0xc0e24d5e"),
            true, 
            "the token doesn't support the HasContractUri interface");

        // HasTokenUri interface
        assert.equal(
            await contentStorage.supportsInterface("0x57eeb456"),
            true, 
            "the token doesn't support the HasTokenUri interface");
            
        // HasRoyalties interface
        assert.equal(
            await contentStorage.supportsInterface("0x0982790e"),
            true, 
            "the token doesn't support the HasTokenUri interface");
    });

    it('Check role permissions', async () => {
        var default_admin_role = await contentStorage.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await contentStorage.hasRole(default_admin_role, deployerAddress),
            true,
            "deployer address should be the default admin.")

        assert.equal(
            await contentStorage.hasRole(default_admin_role, playerAddress),
            false,
            "deployer address should be the default admin.")
    });
    
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
        var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1",  100, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]]];
        var results = await contentStorage.addAssetBatch(asset);

        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.fees[0].account == deployerAddress
                    && ev.fees[0].rate == web3.utils.toWei('0.02', 'ether');
            }
        );
        
        TruffleAssert.eventEmitted(
            results,
            'PublicUriUpdated',
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
                    && ev.version == 0;
            }
        );
        
        assert.equal(
            await contentStorage.ids(1),
            true,
            "Asset wasn't added properly - id doesn't exist");
    
        assert.equal(
            await contentStorage.supply(1),
            0,
            "Asset wasn't added properly - supply is incorrect");
        
        assert.equal(
            await contentStorage.maxSupply(1),
            100,
            "Asset wasn't added properly - maxSupply is incorrect");
    });

    it('Add multiple assets', async () => {
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2",  10, []]
        ];
        var results = await contentStorage.addAssetBatch(asset);

        // Check the token URIs
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
            'PublicUriUpdated',
            (ev) => {
                return ev.id == 2
                    && ev.version == 0;
            }
        );

        TruffleAssert.eventEmitted(
            results,
            'TokenRoyaltiesUpdated',
            (ev) => {
                return ev.tokenId.toString() == 1
                    && ev.fees[0].account == deployerAddress
                    && ev.fees[0].rate == web3.utils.toWei('0.02', 'ether');
            }
        );
    });

    it('Update the current asset supply', async () => {
        var asset = [[1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]]];
        await contentStorage.addAssetBatch(asset);

        assert.equal(
            await contentStorage.supply(1),
            0,
            "Asset wasn't added properly - supply is incorrect");
            
        await contentStorage.updateSupply(1, 5); 

        assert.equal(
            await contentStorage.supply(1),
            5,
            "Asset wasn't added properly - supply is incorrect");
    });
    
    it('Basic Royalties tests', async () => {
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, []],
            [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 10, [[deployerAddress, web3.utils.toWei('0.02', 'ether')], [deployerAltAddress, web3.utils.toWei('0.03', 'ether')]]]
        ];
        await contentStorage.addAssetBatch(asset);

        tokenFees = await contentStorage.getRoyalties(1);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == web3.utils.toWei('0.02', 'ether'),
            true,
            "Token 1 incorrect royalties");
            
        tokenFees = await contentStorage.getRoyalties(2);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == web3.utils.toWei('0.01', 'ether'),
            true,
            "Token 2 incorrect royalties");
            
        tokenFees = await contentStorage.getRoyalties(3);
        assert.equal(
            tokenFees[0].account == deployerAddress && tokenFees[0].rate == web3.utils.toWei('0.02', 'ether') &&
            tokenFees[1].account == deployerAltAddress && tokenFees[1].rate == web3.utils.toWei('0.03', 'ether'),
            true,
            "Token 3 incorrect royalties");
    });

    it('Basic Uri tests', async () => {
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 10, []],
            [3, "arweave.net/tx/public-uri-3", "arweave.net/tx/private-uri-3", 10, []]
        ];
        await contentStorage.addAssetBatch(asset);

        // Test Public Uri
        assert.equal(
            await contentStorage.uri(1, 0),
            "arweave.net/tx/public-uri-1",
            "Token 1 incorrect uri");

        assert.equal(
            await contentStorage.uri(2, 0),
            "arweave.net/tx/public-uri-2",
            "Token 2 incorrect uri");

        assert.equal(
            await contentStorage.uri(3, 0),
            "arweave.net/tx/public-uri-3",
            "Token 3 incorrect uri");
            
        // Test Hidden Uri
        assert.equal(
            await contentStorage.hiddenUri(1, 0),
            "arweave.net/tx/private-uri-1",
            "Token 1 incorrect hidden uri");

        assert.equal(
            await contentStorage.hiddenUri(2, 0),
            "arweave.net/tx/private-uri-2",
            "Token 2 incorrect hidden uri");

        assert.equal(
            await contentStorage.hiddenUri(3, 0),
            "arweave.net/tx/private-uri-3",
            "Token 3 incorrect hidden uri");
            
        // Update Asset 2
        var assetUri = [
            [2, "arweave.net/tx/private-uri-2v1"]
        ];
        
        TruffleAssert.eventEmitted(
            await contentStorage.setHiddenUriBatch(assetUri),
            'HiddenUriUpdated'
        );
        
        assert.equal(
            await contentStorage.hiddenUri(2, 1),
            "arweave.net/tx/private-uri-2v1",
            "Token 2 incorrect hidden uri");
            
        // Update Asset 3
        var assetUri = [
            [3, "arweave.net/tx/public-uri-3v1"]
        ];
        
        TruffleAssert.eventEmitted(
            await contentStorage.setPublicUriBatch(assetUri),
            'PublicUriUpdated'
        );
        
        assert.equal(
            await contentStorage.uri(3, 1),
            "arweave.net/tx/public-uri-3v1",
            "Token 3 incorrect uri");
    });
});
