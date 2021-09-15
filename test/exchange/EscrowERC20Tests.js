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
        player2Address,             // Player 2 Address
        creatorAddress,             // Creator Address
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
    });

    it('Supports the EscrowERC20 Interface', async () => {
        // INTERFACE_ID_ERC20_ESCROW = 0x00000008
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

        await escrow.deposit(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't deposited for Order 1."
        );

        assert.equal (
            await rawrToken.balanceOf(escrow.address),
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't deposited in the escrow"
        );
    });
    
    it('Withdraw 10000 RAWR tokens from player address', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        
        await escrow.deposit(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});
        
        // After moving assets to the escrow
        assert.equal (
            (await rawrToken.balanceOf(playerAddress)).toString(),
            web3.utils.toWei('10000', 'ether').toString(), 
            "10000 wasn't withdrawed to the player"
        );

        await escrow.withdraw(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            0, 
            "10000 rawr tokens moved wasn't recorded properly"
        );
        
        assert.equal (
            await rawrToken.balanceOf(escrow.address),
            0, 
            "10000 rawr tokens are still in escrowed"
        );
        
        assert.equal (
            (await rawrToken.balanceOf(playerAddress)).toString(),
            web3.utils.toWei('20000', 'ether').toString(), 
            "10000 wasn't withdrawed to the player"
        );
    });
    
    it('Withdraw 10000 RAWR tokens from player address in 2 transactions', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

        await escrow.withdraw(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        await escrow.withdraw(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            0, 
            "10000 wasn't withdrawn for Order 1."
        );
        
        assert.equal (
            (await rawrToken.balanceOf(playerAddress)).toString(),
            web3.utils.toWei('20000', 'ether').toString(), 
            "10000 wasn't withdrawed to the player"
        );
    });

    it('Invalid Withdraw', async () => {
        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        await TruffleAssert.fails(
            escrow.withdraw(1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('5000', 'ether'), 
            "Internal value for Order 1 is incorrect."
        );
    });

    it('Deposit Royalty', async () => {
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        await escrow.depositRoyalty(playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('5000', 'ether'), 
            "Internal value for Order 1 is incorrect."
        );
        
        // check claimable tokens for player 1
        assert.equal (
            await escrow.claimableTokensByOwner(creatorAddress),
            web3.utils.toWei('5000', 'ether'), 
            "Claimable royalty for creator address is incorrect."
        );
    });

    it('Transfer Royalty from escrow to claimable', async () => {
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        await escrow.transferRoyalty(1, creatorAddress, web3.utils.toWei('1000', 'ether'), {from: executionManagerAddress});
        
        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('4000', 'ether'), 
            "Internal value for Order 1 is incorrect."
        );
        
        // check claimable tokens for player 1
        assert.equal (
            await escrow.claimableTokensByOwner(creatorAddress),
            web3.utils.toWei('1000', 'ether'), 
            "Claimable royalty for Player 1 is incorrect."
        );
    });

    it('Claim Royalty', async () => {
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.depositRoyalty(playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        assert.equal (
            await escrow.claimableTokensByOwner(creatorAddress),
            web3.utils.toWei('5000', 'ether'), 
            "Claimable royalty for creator address is incorrect."
        );

        await escrow.claim(creatorAddress, {from: executionManagerAddress});

        assert.equal (
            await escrow.claimableTokensByOwner(creatorAddress),
            0, 
            "Claimable royalty for creator address is incorrect."
        );

        assert.equal (
            (await rawrToken.balanceOf(creatorAddress)).toString(),
            web3.utils.toWei('5000', 'ether').toString(), 
            "5000 wasn't claimed by creator address"
        );
    });

    it('Place Order and Fill Order', async () => {
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        await escrow.transferRoyalty(1, creatorAddress, web3.utils.toWei('1000', 'ether'), {from: executionManagerAddress});
        
        await escrow.withdraw(1, player2Address, web3.utils.toWei('4000', 'ether'), {from: executionManagerAddress});

        await escrow.claim(creatorAddress, {from: executionManagerAddress});

        // Check escrowed tokens for Order 1
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            0, 
            "Internal value for Order 1 is incorrect."
        );

        // Checked claimable tokens for player 1
        assert.equal (
            await escrow.claimableTokensByOwner(playerAddress),
            0, 
            "Claimable royalty for Player 1 is incorrect."
        );
    });
});
