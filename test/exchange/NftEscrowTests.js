const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentFactory = artifacts.require("ContentFactory");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
const NftEscrow = artifacts.require("NftEscrow");
const TruffleAssert = require("truffle-assertions");
const { constants } = require('@openzeppelin/test-helpers');

contract('NFT Escrow Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        playerAddress,              // Player Address
    ] = accounts;

    var escrow;
    var content;
    var contentFactory;
    var assetData;

    before(async () => {
        var originalAccessControlManager = await AccessControlManager.new();
        var originalContent = await Content.new();
        var originalContentStorage = await ContentStorage.new();
        var originalContentManager = await ContentManager.new();
        contentFactory = await ContentFactory.new();
    
        // Initialize Clone Factory
        await contentFactory.__ContentFactory_init(
            originalContent.address,
            originalContentManager.address,
            originalContentStorage.address,
            originalAccessControlManager.address);
    });

    beforeEach(async () => {
        escrow = await NftEscrow.new();
        await escrow.__NftEscrow_init({from: deployerAddress});
        
        // Register the execution manager
        await escrow.registerManager(executionManagerAddress, {from:deployerAddress})
    });

    async function createContentContract() {
        var uri = "arweave.net/tx-contract-uri";

        var result = await contentFactory.createContracts(
            [[deployerAddress, 10000]],
            uri);
        
        content = await Content.at(result.logs[2].args.content);
        contentManager = await ContentManager.at(result.logs[2].args.contentManager);
        
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", constants.MAX_UINT256, [[deployerAddress, 20000]]],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, []],
        ];

        // Add 2 assets
        await contentManager.addAssetBatch(asset);

        // Mint an assets
        var mintData = [playerAddress, [1, 2], [10, 1], 0, constants.ZERO_ADDRESS, []];
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        assetData = [content.address, 1];

        // approve player
        await content.setApprovalForAll(escrow.address, true, {from:playerAddress});
    }

    it('Check if NftEscrow was deployed properly', async () => {
        assert.equal(
            escrow.address != 0x0,
            true,
            "Escrow was not deployed properly.");
    });

    it('Supports the NftEscrow Interface', async () => {
        // INTERFACE_ID_NFT_ESCROW = 0x00000007
        assert.equal(
            await escrow.supportsInterface("0x00000007"),
            true, 
            "the escrow doesn't support the NftEscrow interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        var default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();
        assert.equal(
            await escrow.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Deployer wallet must not have manager role', async () => {
        var manager_role = await escrow.MANAGER_ROLE();
        assert.equal(
            await escrow.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet should not have the manager role");
    });
    
    it('Registering Manager address', async () => {       
        var manager_role = await escrow.MANAGER_ROLE();

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
        await createContentContract();

        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAmounts(1),
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
        
        var internalAssetData = await escrow.escrowedAsset(1);
        assert.equal(
            internalAssetData[0] == assetData[0] && internalAssetData[1] == assetData[1],
            true,
            "Incorrect number of assets escrowed."
        );
    });
    
    it('Withdraw Asset', async () => {
        await createContentContract();

        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        
        await escrow.withdraw(1, playerAddress, 1, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAmounts(1),
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
        await createContentContract();

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
            await escrow.escrowedAmounts(1),
            1,
            "Incorrect number of assets escrowed."
        );
    });

    it('Withdraw Batch Asset', async () => {
        await createContentContract();

        await escrow.deposit(1, playerAddress, 1, assetData, {from: executionManagerAddress});
        await escrow.deposit(2, playerAddress, 3, assetData, {from: executionManagerAddress});
        await escrow.deposit(3, playerAddress, 2, assetData, {from: executionManagerAddress});
        
        var orders = [1,2,3];
        var amounts = [1,3,1];
        await escrow.withdrawBatch(orders, playerAddress, amounts, {from: executionManagerAddress});

        assert.equal(
            await escrow.escrowedAmounts(2),
            0,
            "Incorrect number of assets escrowed."
        );
        
        assert.equal(
            await escrow.escrowedAmounts(3),
            1,
            "Incorrect number of assets escrowed."
        );
    });
    
    it('Invalid Withdraws', async () => {
        await createContentContract();

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
