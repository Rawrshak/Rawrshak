const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const EscrowDistributions = artifacts.require("EscrowDistributions");
const TruffleAssert = require("truffle-assertions");

contract('Escrow ERC20 Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var rawrToken;
    var escrow;
    var manager_role;
    var default_admin_role;

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        escrow = await EscrowDistributions.new();
        await escrow.__EscrowDistributions_init(rawrToken.address, {from: deployerAddress});

        manager_role = await escrow.MANAGER_ROLE();
        default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();

        // Register the execution manager
        await escrow.registerManager(executionManagerAddress, {from:deployerAddress})

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    });

    it('Check if EscrowERC20 was deployed properly', async () => {
        assert.equal(
            escrow.address != 0x0,
            true,
            "Escrow was not deployed properly.");

        assert.equal(
            await escrow.getToken(),
            rawrToken.address,
            "Rawr Token was not stored in the EscrowERC20 contract properly.");
    });

    it('Supports the EscrowERC20 Interface', async () => {
        // _INTERFACE_ID_ESCROW_ERC20 = 0x00000008
        assert.equal(
            await escrow.supportsInterface("0x00000008"),
            true, 
            "the escrow doesn't support the EscrowERC20 interface");
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
});
