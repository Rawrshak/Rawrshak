const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AccessControlManager = artifacts.require("AccessControlManager");
const ContentStorage = artifacts.require("ContentStorage");
const Content = artifacts.require("Content");
const TruffleAssert = require("truffle-assertions");
const { sign } = require("../mint");

// Todo: Update test for IsElevatedCaller()
contract('AccessControlManager Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        craftingSystemAddress,      // crafting system address
        minterAddress,              // minter address
        playerAddress
    ] = accounts;
    var manager;

    beforeEach(async () => {
        manager = await AccessControlManager.new();
        await manager.__AccessControlManager_init();
    });

    it('Check Deployer has the Default Admin Role', async () => {
        default_admin_role = await manager.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await manager.hasRole(default_admin_role, deployerAddress),
            true,
            "deployer should be the default admin controller");
    });

    it('Change Parent and check roles', async () => {
        default_admin_role = await manager.DEFAULT_ADMIN_ROLE();

        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, manager.address);
        
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
        // Non-content contract
        await TruffleAssert.fails(
            manager.setParent(playerAddress),
            TruffleAssert.ErrorType.REVERT
        );

        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, manager.address);
        
        // caller doesn't have the default admin role
        await TruffleAssert.fails(
            manager.setParent(content.address, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Add and Remove Minter Address', async () => {
        minter_role = await manager.MINTER_ROLE();
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
        const signature = await sign(playerAddress, [1], [1], 0, craftingSystemAddress, manager.address);
        var mintData = [playerAddress, [1], [1], 0, craftingSystemAddress, signature];

        await TruffleAssert.passes(manager.verifyMint(mintData, deployerAddress));
    });

    it('VerifyMint() for minter accounts', async () => {
        minter_role = await manager.MINTER_ROLE();
        await manager.grantRole(minter_role, minterAddress, {from: deployerAddress});
        
        const signature = await sign(playerAddress, [1], [1], 0, craftingSystemAddress, manager.address);
        var mintData = [playerAddress, [1], [1], 0, craftingSystemAddress, signature];

        await TruffleAssert.passes(manager.verifyMint(mintData, minterAddress));
    });

    it('VerifyMint() for from signed message', async () => {
        minter_role = await manager.MINTER_ROLE();
        await manager.grantRole(minter_role, minterAddress, {from: deployerAddress});
        
        const signature = await sign(playerAddress, [1], [1], 1, minterAddress, manager.address);
        var mintData = [playerAddress, [1], [1], 1, minterAddress, signature];

        await TruffleAssert.passes(manager.verifyMint(mintData, playerAddress));
    });

    it('VerifyMint() failure from signed message account with no access', async () => {
        // minter address doesn't have the minter role
        const signature = await sign(playerAddress, [1], [1], 1, minterAddress, manager.address);
        var mintData = [playerAddress, [1], [1], 1, minterAddress, signature];

        await TruffleAssert.fails(
            manager.verifyMint(mintData, playerAddress),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
