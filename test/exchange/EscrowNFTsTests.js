const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('Escrow NFTs Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var content;
    var contentStorage;
    var asset = [
        [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, web3.utils.toWei('0.02', 'ether')]]],
        [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
    ];
    var approvalPair = [[executionManagerAddress, true]];

    var escrow;
    var manager_role;
    var default_admin_role;

    beforeEach(async () => {
        // Set up NFT Contract
        accessControlManager = await AccessControlManager.new();
        await accessControlManager.__AccessControlManager_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, accessControlManager.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, accessControlManager.address);
        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await contentStorage.setParent(content.address);
        await accessControlManager.grantRole(await accessControlManager.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.setParent(content.address);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 1], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        escrow = await EscrowNFTs.new();
        await escrow.__EscrowNFTs_init({from: deployerAddress});

        manager_role = await escrow.MANAGER_ROLE();
        default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();

        // Register the execution manager
        await escrow.registerManager(executionManagerAddress, {from:deployerAddress})
    });

    it('Check if EscrowNFTs was deployed properly', async () => {
        assert.equal(
            escrow.address != 0x0,
            true,
            "Escrow was not deployed properly.");
    });

    it('Supports the EscrowNFTs Interface', async () => {
        // _INTERFACE_ID_ESCROW_NFTS = 0x00000007
        assert.equal(
            await escrow.supportsInterface("0x00000007"),
            true, 
            "the escrow doesn't support the EscrowNFTs interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        assert.equal(
            await escrow.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Deployer wallet must not have manager role', async () => {
        assert.equal(
            await escrow.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet should not have the manager role");
    });
    
    it('Registering Manager address', async () => {        
        TruffleAssert.eventEmitted(
            await escrow.registerManager(royaltiesManagerAddress, {from:deployerAddress}),
            'ManagerRegistered'
        );

        assert.equal(
            await escrow.hasRole(
                manager_role,
                executionManagerAddress),
            true, 
            "execution manager should have the manager role");

        assert.equal(
            await escrow.hasRole(
                manager_role,
                royaltiesManagerAddress),
            true, 
            "royalties manager should have the manager role");
    });
    
    it('Depositing Asset', async () => {
        var assetData = [content.address, 1];

        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAssetsByOrder(1),
            1,
            "Incorrect number of assets escrow recorded"
        );

        assert.equal(
            await content.balanceOf(escrow.address, 1),
            1,
            "Incorrect number of assets escrowed."
        );

        assert.equal(
            await content.balanceOf(playerAddress, 1),
            9,
            "Incorrect number of assets owned by the player"
        );
        
        var internalAssetData = await escrow.assetData(1);
        assert.equal(
            internalAssetData[0] == assetData[0] && internalAssetData[1] == assetData[1],
            true,
            "Incorrect number of assets escrowed."
        );
    });
    
    it('Withdraw Asset', async () => {
        var assetData = [content.address, 1];

        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        
        await escrow.withdraw(1, playerAddress, 1, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAssetsByOrder(1),
            0,
            "Incorrect number of assets escrowed."
        );

        assert.equal(
            await content.balanceOf(escrow.address, 1),
            0,
            "Asset not withdrawn from the escrow"
        );

        assert.equal(
            await content.balanceOf(playerAddress, 1),
            10,
            "Player wasn't able to withdraw asset"
        );
    });
    
    it('Invalid Withdraws', async () => {
        var assetData = [content.address, 1];

        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        
        await TruffleAssert.fails(
            escrow.withdraw(1, playerAddress, 2, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            escrow.withdraw(2, playerAddress, 1, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        assert.equal(
            await escrow.escrowedAssetsByOrder(1),
            1,
            "Incorrect number of assets escrowed."
        );
    });

    it('Withdraw Batch Asset', async () => {
        var assetData = [content.address, 1];

        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        await escrow.deposit(2, playerAddress, 3, assetData, {from: executionManagerAddress});
        await escrow.deposit(3, playerAddress, 2, assetData, {from: executionManagerAddress});
        
        var orders = [1,2,3];
        var amounts = [1,3,1];
        await escrow.withdrawBatch(orders, playerAddress, amounts, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAssetsByOrder(2),
            0,
            "Incorrect number of assets escrowed."
        );
        
        assert.equal(
            await escrow.escrowedAssetsByOrder(3),
            1,
            "Incorrect number of assets escrowed."
        );
    });
    
    it('Invalid Withdraws', async () => {
        var assetData = [content.address, 1];
        
        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        await escrow.deposit(2, playerAddress, 3, assetData, {from: executionManagerAddress});
        await escrow.deposit(3, playerAddress, 2, assetData, {from: executionManagerAddress});
        
        var orders = [1,2,3];
        var amounts = [1,4,1];

        await TruffleAssert.fails(
            escrow.withdrawBatch(orders, playerAddress, amounts, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        var orders = [1,4];
        var amounts = [1,1];
        await TruffleAssert.fails(
            escrow.withdrawBatch(orders, playerAddress, amounts, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
