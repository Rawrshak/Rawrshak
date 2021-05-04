const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const SystemsRegistry = artifacts.require("SystemsRegistry");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const TruffleAssert = require("truffle-assertions");

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
        [1, "CID-1", 0, [[deployerAddress, 200]]],
        [2, "CID-2", 100, []],
    ];
    var approvalPair = [[executionManagerAddress, true]];
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    var escrow;
    var manager_role;
    var default_admin_role;

    beforeEach(async () => {
        // Set up NFT Contract
        systemsRegistry = await SystemsRegistry.new();
        await systemsRegistry.__SystemsRegistry_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init("ipfs:/", [[deployerAddress, 100]]);
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", "ipfs:/contract-uri", contentStorage.address, systemsRegistry.address);
        contentStorage.setParent(content.address);
        systemsRegistry.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, systemsRegistry.address);
        await content.transferOwnership(contentManager.address, {from: deployerAddress});
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await systemsRegistry.grantRole(await systemsRegistry.OWNER_ROLE(), contentManager.address, {from: deployerAddress});

        // give crafting system approval
        var approvalPair = [[executionManagerAddress, true]];
        await contentManager.registerSystem(approvalPair);

        // Add 2 assets
        await contentManager.addAssetBatch(asset);
        
        // approve systems for player address
        await content.approveAllSystems(true, {from:playerAddress});

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 1], 0, zeroAddress, []];
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
            await escrow.getEscrowedAssetsByOrder(1),
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
        
        var internalAssetData = await escrow.getOrderAsset(1);
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
            await escrow.getEscrowedAssetsByOrder(1),
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
            await escrow.getEscrowedAssetsByOrder(1),
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
            await escrow.getEscrowedAssetsByOrder(2),
            0,
            "Incorrect number of assets escrowed."
        );
        
        assert.equal(
            await escrow.getEscrowedAssetsByOrder(3),
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
