const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AccessControlManager = artifacts.require("AccessControlManager");
const ContentStorage = artifacts.require("ContentStorage");
const Content = artifacts.require("Content");
const TruffleAssert = require("truffle-assertions");
const { sign } = require("../mint");

contract('AccessControlManager Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // alt address for tests
        minterAddress,              // minter address
        playerAddress
    ] = accounts;
    var manager;

    beforeEach(async () => {
        manager = await AccessControlManager.new();
        await manager.__AccessControlManager_init();
        
        default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
        minter_role = await manager.MINTER_ROLE();
    });

    it('Check Deployer has the Default Admin Role', async () => {
        assert.equal(
            await manager.hasRole(default_admin_role, deployerAddress),
            true,
            "deployer should be the default admin controller");
    });

    it('Change Parent and check roles', async () => {
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);
        
        await manager.setParent(content.address);

        assert.equal(
            await manager.hasRole(default_admin_role, content.address),
            true,
            "content contract should be the default admin now");
        
        // deployer is not the default admin anymore
        assert.equal(
            await manager.hasRole(default_admin_role, deployerAddress),
            false,
            "deployer should not be the default admin");
    });

    it('Invalid SetParent()', async () => {
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);
        
        // caller doesn't have the default admin role
        await TruffleAssert.fails(
            manager.setParent(content.address, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Add and Remove Minter Address', async () => {
        await manager.grantRole(minter_role, minterAddress, {from: deployerAddress});

        assert.equal(
            await manager.hasRole(minter_role, minterAddress),
            true,
            "minter address should have the minter role");

        await manager.revokeRole(minter_role, minterAddress, {from: deployerAddress});
        assert.equal(
            await manager.hasRole(minter_role, minterAddress),
            false,
            "minter address should not have the minter role");
    });

    
    it('VerifyMint() for owner', async () => {
        await manager.grantRole(minter_role, deployerAddress);
        await manager.grantRole(default_admin_role, deployerAltAddress);

        // Set Content Contract as parent & verifying contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);

        // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
        await manager.setParent(content.address);
        
        // Sign where the verifying contract address is the contentContractAddress
        const signature = await sign(playerAddress, [1], [1], 1, deployerAddress, content.address);
        var mintData = [playerAddress, [1], [1], 1, deployerAddress, signature];

        // deployerAltAddress pretending to be contract address and calling verifyMint()
        await TruffleAssert.passes(manager.verifyMint(mintData, deployerAddress, {from: deployerAltAddress}));
    });

    it('VerifyMint() for minter accounts', async () => {
        await manager.grantRole(minter_role, minterAddress);
        await manager.grantRole(default_admin_role, deployerAltAddress);
        
        // Set Content Contract as parent & verifying contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);

        // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
        await manager.setParent(content.address);
        
        const signature = await sign(playerAddress, [1], [1], 1, minterAddress, content.address);
        var mintData = [playerAddress, [1], [1], 1, minterAddress, signature];

        // deployerAltAddress pretending to be contract address and calling verifyMint(); 
        // The caller has the minter role, so it bypasses the check and mints.
        await TruffleAssert.passes(manager.verifyMint(mintData, minterAddress, {from: deployerAltAddress}));
    });

    it('VerifyMint() for from signed message', async () => {
        await manager.grantRole(minter_role, minterAddress);
        await manager.grantRole(default_admin_role, deployerAltAddress);
        
        // Set Content Contract as parent & verifying contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);

        // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
        await manager.setParent(content.address);
        
        const signature = await sign(playerAddress, [1], [1], 1, minterAddress, content.address);
        var mintData = [playerAddress, [1], [1], 1, minterAddress, signature];

        // The caller is a player but has a signed message from the minter to mint for them.
        await TruffleAssert.passes(manager.verifyMint(mintData, playerAddress, {from: deployerAltAddress}));
    });

    it('VerifyMint() failure from signed message', async () => {
        await manager.grantRole(default_admin_role, deployerAltAddress);
        
        // Set Content Contract as parent & verifying contract
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, 10000]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init(contentStorage.address, manager.address);

        // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
        await manager.setParent(content.address);
        
        // minter address doesn't have the minter role
        var signature = await sign(playerAddress, [1], [1], 1, minterAddress, content.address);
        var mintData = [playerAddress, [1], [1], 1, minterAddress, signature];

        await TruffleAssert.fails(
            manager.verifyMint(mintData, playerAddress, {from: deployerAltAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Invalid Nonce
        signature = await sign(playerAddress, [1], [1], 0, minterAddress, content.address);
        mintData = [playerAddress, [1], [1], 0, minterAddress, signature];

        await TruffleAssert.fails(
            manager.verifyMint(mintData, playerAddress, {from: deployerAltAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Signer doesn't match
        signature = await sign(playerAddress, [1], [1], 1, minterAddress, content.address);
        mintData = [playerAddress, [1], [1], 1, playerAddress, signature];

        await TruffleAssert.fails(
            manager.verifyMint(mintData, playerAddress, {from: deployerAltAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Invalid Caller
        signature = await sign(playerAddress, [1], [1], 1, minterAddress, content.address);
        mintData = [playerAddress, [1], [1], 1, playerAddress, signature];

        await TruffleAssert.fails(
            manager.verifyMint(mintData, playerAddress),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
