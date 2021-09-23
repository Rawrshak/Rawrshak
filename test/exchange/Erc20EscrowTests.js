const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const Erc20Escrow = artifacts.require("Erc20Escrow");
const TruffleAssert = require("truffle-assertions");

contract('ERC20 Escrow Contract tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        platformFeesPoolAddress,    // platform fees pool address
        playerAddress,              // Player Address
        player2Address,             // Player 2 Address
        creatorAddress,             // Creator Address
    ] = accounts;

    var rawrToken;
    var escrow;

    beforeEach(async () => {
        escrow = await Erc20Escrow.new();
        await escrow.__Erc20Escrow_init({from: deployerAddress});
    });

    async function setup() {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Register the execution manager
        await escrow.registerManager(executionManagerAddress, {from:deployerAddress});

        // add token support
        await escrow.addSupportedTokens(rawrToken.address, {from:executionManagerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    }

    it('Check if Erc20Escrow was deployed properly', async () => {
        assert.equal(
            escrow.address != 0x0,
            true,
            "Escrow was not deployed properly.");
    });

    it('Supports the Erc20Escrow Interface', async () => {
        // INTERFACE_ID_ERC20_ESCROW = 0x00000008
        assert.equal(
            await escrow.supportsInterface("0x00000008"),
            true, 
            "the escrow doesn't support the Erc20Escrow interface");
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
            false, 
            "execution manager should not have the manager role yet");

        assert.equal(
            await escrow.hasRole(
                manager_role,
                royaltiesManagerAddress),
            true, 
            "royalties manager should have the manager role");
    });
    
    it('Deposit 10000 RAWR tokens from player 1', async () => {
        await setup();

        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});

        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

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
        await setup();

        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});
        
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
        await setup();

        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('10000', 'ether'), {from: executionManagerAddress});

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
        await setup();

        // Allow rawr tokens to be escrowed
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

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
        await setup();

        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        await escrow.methods['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('5000', 'ether'), 
            "Internal value for Order 1 is incorrect."
        );
        
        // check claimable tokens for player 1
        var claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal(
            claimable.tokens[0],
            rawrToken.address,
            "Claimable royalty token should be the RawrToken"
        );
        assert.equal(
            claimable.amounts[0],
            web3.utils.toWei('5000', 'ether'), 
            "Claimable royalty amount is incorrect"
        );
    });

    it('Transfer Royalty from escrow to claimable', async () => {
        await setup();
        
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        await escrow.methods['transferRoyalty(uint256,address,uint256)'](1, creatorAddress, web3.utils.toWei('1000', 'ether'), {from: executionManagerAddress});
        
        // check escrowed tokens by order (1)
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            web3.utils.toWei('4000', 'ether'), 
            "Internal value for Order 1 is incorrect."
        );
        
        // check claimable tokens for player 1
        var claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal(
            claimable.amounts[0],
            web3.utils.toWei('1000', 'ether'), 
            "Claimable royalty amount for Player 1 is incorrect."
        );
    });

    it('Claim Royalty', async () => {
        await setup();
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.methods['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        var claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal (
            claimable.amounts[0],
            web3.utils.toWei('5000', 'ether'), 
            "Claimable royalty for creator address is incorrect."
        );

        await escrow.claimRoyalties(creatorAddress, {from: executionManagerAddress});

        claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal (
            claimable.amounts.length,
            0, 
            "Claimable royalty for creator address is incorrect."
        );

        assert.equal (
            (await rawrToken.balanceOf(creatorAddress)).toString(),
            web3.utils.toWei('5000', 'ether').toString(), 
            "5000 wasn't claimed by creator address"
        );
    });

    it('Deposit and claim royalties with multiple different token pools', async () => {
        await setup();

        // Set up second token
        rawrToken2 = await RawrToken.new();
        await rawrToken2.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // add token support
        await escrow.addSupportedTokens(rawrToken2.address, {from:executionManagerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken2.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});


        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await rawrToken2.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});

        // Deposit Royalty
        await escrow.methods['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        await escrow.methods['transferRoyalty(address,address,address,uint256)'](rawrToken2.address, playerAddress, creatorAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        // Checked claimable tokens for player 1
        claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal(
            claimable.tokens[0] == rawrToken.address && claimable.tokens[1] == rawrToken2.address,
            true,
            "Claimable token addresses for creator is incorrect."
        )
        assert.equal(
            claimable.amounts.length,
            2, 
            "Claimable royalty for Creator is incorrect."
        );

        // Creator claims
        await escrow.claimRoyalties(creatorAddress, {from: executionManagerAddress});
        
        claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal(
            claimable.amounts.length,
            0, 
            "Claimable royalty for Creator is incorrect."
        );

        // Check balance
        assert.equal (
            (await rawrToken.balanceOf(creatorAddress)).toString(),
            web3.utils.toWei('5000', 'ether').toString(), 
            "5000 wasn't claimed by creator address from Rawr address"
        );
        assert.equal (
            (await rawrToken2.balanceOf(creatorAddress)).toString(),
            web3.utils.toWei('5000', 'ether').toString(), 
            "5000 wasn't claimed by creator address from Rawr 2 address"
        );
    });

    it('Deposit and Transfer platform fees', async () => {
        await setup();
        await rawrToken.approve(escrow.address, web3.utils.toWei('10000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});
        
        // deposit platform fee
        await escrow.methods['transferPlatformFee(address,address,address,uint256)'](rawrToken.address, playerAddress, platformFeesPoolAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        // check platform fees pool balance
        assert.equal (
            (await rawrToken.balanceOf(platformFeesPoolAddress)).toString(),
            web3.utils.toWei('5000', 'ether').toString(), 
            "5000 wasn't sent to the platform fees pool."
        );

        // transfer platform fee
        await escrow.methods['transferPlatformFee(uint256,address,uint256)'](1, platformFeesPoolAddress, web3.utils.toWei('1000', 'ether'), {from: executionManagerAddress});

        // check platform fees pool balance
        assert.equal (
            (await rawrToken.balanceOf(platformFeesPoolAddress)).toString(),
            web3.utils.toWei('6000', 'ether').toString(), 
            "6000 wasn't sent to the platform fees pool."
        );
        
        // check platform fees pool balance
        assert.equal (
            (await rawrToken.balanceOf(escrow.address)).toString(),
            web3.utils.toWei('4000', 'ether').toString(), 
            "Escrow balance is incorrect"
        );
    });

    it('Place Order and Fill Order', async () => {
        await setup();
        await rawrToken.approve(escrow.address, web3.utils.toWei('5000', 'ether'), {from:playerAddress});
        await escrow.deposit(rawrToken.address, 1, playerAddress, web3.utils.toWei('5000', 'ether'), {from: executionManagerAddress});

        await escrow.methods['transferRoyalty(uint256,address,uint256)'](1, creatorAddress, web3.utils.toWei('1000', 'ether'), {from: executionManagerAddress});

        await escrow.withdraw(1, player2Address, web3.utils.toWei('4000', 'ether'), {from: executionManagerAddress});

        await escrow.claimRoyalties(creatorAddress, {from: executionManagerAddress});

        // Check escrowed tokens for Order 1
        assert.equal (
            await escrow.escrowedTokensByOrder(1),
            0, 
            "Internal value for Order 1 is incorrect."
        );

        // Checked claimable tokens for player 1
        claimable = await escrow.claimableTokensByOwner(creatorAddress);
        assert.equal (
            claimable.amounts.length,
            0, 
            "Claimable royalty for Player 1 is incorrect."
        );
    });
});
