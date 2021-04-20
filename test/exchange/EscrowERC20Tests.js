const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const EscrowERC20 = artifacts.require("EscrowERC20");
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
        escrow = await EscrowERC20.new();
        await escrow.__EscrowERC20_init(rawrToken.address, {from: deployerAddress});

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
    
    it('Deposit 10000 RAWR tokens from player 1', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});

        // executionManagerAllowance = await rawrToken.allowance(playerAddress, executionManagerAddress);
        // escrowAllowance = await rawrToken.allowance(playerAddress, escrow.address);
        // console.log("Escrow: " + escrowAllowance.toString() + ", Execution Manager Allowance: " + executionManagerAllowance.toString());

        await escrow.deposit(playerAddress, 1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        assert.equal(
            (await rawrToken.balanceOf(escrow.address)).toString(), 
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't sent to escrow."
        );

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.getEscrowedTokensByOrder(1),
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't deposited for Order 1."
        );
    });
    
    it('Withdraw 10000 RAWR tokens from player 2', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(playerAddress, 1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        await escrow.methods['withdraw(address,uint256,uint256)'](player2Address, 1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(), 
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't withdrawn to player 2."
        );

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.getEscrowedTokensByOrder(1),
            0, 
            "10000 wasn't withdrawn for Order 1."
        );
    });
    
    it('Withdraw 10000 RAWR tokens from player 2 in 2 transactions', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(playerAddress, 1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        await escrow.methods['withdraw(address,uint256,uint256)'](player2Address, 1, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        await escrow.methods['withdraw(address,uint256,uint256)'](player2Address, 1, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(), 
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't withdrawn to player 2."
        );

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.getEscrowedTokensByOrder(1),
            0, 
            "10000 wasn't withdrawn for Order 1."
        );
    });

    it('Call withdraw without withdrawing the tokens', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(playerAddress, 1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        await escrow.methods['withdraw(uint256,uint256)'](1, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});
        
        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.getEscrowedTokensByOrder(1),
            0, 
            "Internal value for Order 1 is incorrect."
        );
        
        assert.equal(
            (await rawrToken.balanceOf(escrow.address)).toString(), 
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't incorrectly withdrawrn from the escrow."
        );
    });
});
