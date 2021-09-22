const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const MockStaking = artifacts.require("MockStaking");
const AddressResolver = artifacts.require("AddressResolver");
const TruffleAssert = require("truffle-assertions");

contract('Exchange Fees Escrow Contract tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        playerAddress,              // Player Address
        staker1,                    // 1st Staker
        staker2,                    // 2nd Staker
    ] = accounts;
    
    var rawrToken;
    var feesEscrow;

    var staking;

    before(async () => {            
        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});
    });

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        feesEscrow = await ExchangeFeesEscrow.new();
        await feesEscrow.__ExchangeFeesEscrow_init(resolver.address, {from: deployerAddress});

        staking = await MockStaking.new(resolver.address);
    });

    async function setup() {
        // Register the execution manager
        await feesEscrow.registerManager(staking.address, {from:deployerAddress})
        
        // register the escrows
        await resolver.registerAddress(["0x1b48faca", "0x7f170836"], [staking.address, feesEscrow.address], {from: deployerAddress});
    }

    it('Check if ExchangeFeesEscrow was deployed properly', async () => {
        assert.equal(
            feesEscrow.address != 0x0,
            true,
            "Exchange Fee Pool was not deployed properly.");
    });

    it('Supports the ExchangeFeesEscrow Interface', async () => {
        // INTERFACE_ID_LibContractHash.CONTRACT_EXCHANGE_FEE_ESCROW = 0x00000012
        assert.equal(
            await feesEscrow.supportsInterface("0x00000012"),
            true, 
            "the contract doesn't support the ExchangeFeesEscrow interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        default_admin_role = await feesEscrow.DEFAULT_ADMIN_ROLE();
        assert.equal(
            await feesEscrow.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Registering Manager address', async () => {
        manager_role = await feesEscrow.MANAGER_ROLE();
        // Register the execution manager
        TruffleAssert.eventEmitted(
            await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress}),
            'ManagerRegistered'
        );
        
        TruffleAssert.eventEmitted(
            await feesEscrow.registerManager(royaltiesManagerAddress, {from:deployerAddress}),
            'ManagerRegistered'
        );

        assert.equal(
            await feesEscrow.hasRole(
                manager_role,
                executionManagerAddress),
            true, 
            "execution manager should have the manager role");

        assert.equal(
            await feesEscrow.hasRole(
                manager_role,
                royaltiesManagerAddress),
            true, 
            "royalties manager should have the manager role");
    });
    
    it('Update Rate', async () => {
        await setup();
        
        assert.equal(
            await feesEscrow.rate(),
            0, 
            "initial Exchange Fees rate is incorrect.");

        // fails to set the rate because there are no tokens being staked
        await TruffleAssert.fails(
            feesEscrow.setRate(30000, {from:deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // add a staker
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});

        TruffleAssert.eventEmitted(
            await feesEscrow.setRate(30000, {from:deployerAddress}),
            'FeeUpdated'
        );
        assert.equal(
            await feesEscrow.rate(),
            30000, 
            "updated Exchange Fees rate is incorrect.");
    });

    it('Deposit Royalties', async () => {
        await setup();

        TruffleAssert.eventEmitted(
            await feesEscrow.depositFees(rawrToken.address, 10000, {from: deployerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feesEscrow.totalFees(rawrToken.address), 10000, "Total fee pool incorrect.");
        
        TruffleAssert.eventEmitted(
            await feesEscrow.depositFees(rawrToken.address, 5000, {from: deployerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feesEscrow.totalFees(rawrToken.address), 15000, "Total fee pool incorrect.");
    });
    
    it('Deposit Multiple Token Royalties', async () => {
        await setup();

        // Create a 2nd token
        var rawrV2Token = await RawrToken.new();
        await rawrV2Token.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give tokens to Player
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrV2Token.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        await setup();

        // Deposit 10,000 of Rawr token fees
        await rawrToken.transfer(feesEscrow.address, 10000, {from: playerAddress});
        
        TruffleAssert.eventEmitted(
            await feesEscrow.depositFees(rawrToken.address, 10000, {from: deployerAddress}),
            'ExchangeFeesPaid'
        );
        
        // Deposit 10,000 of RawrV2 token fees
        await rawrV2Token.transfer(feesEscrow.address, 10000, {from: playerAddress});
        TruffleAssert.eventEmitted(
            await feesEscrow.depositFees(rawrV2Token.address, 10000, {from: deployerAddress}),
            'ExchangeFeesPaid'
        );
        
        // Check Escrow fees for both tokens
        assert.equal(await feesEscrow.totalFees(rawrToken.address), 10000, "Total fee pool incorrect for Rawr Token");
        assert.equal(await feesEscrow.totalFees(rawrV2Token.address), 10000, "Total fee pool incorrect for Rawr V2 token");
    });

    it('Stake tokens before Exchange Fees', async () => {
        await setup();

        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // add stakers - this calls staking().initializeTokenRate()
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});

        // Update internal deposits
        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        var p1claimable = await feesEscrow.getClaimableRewards(staker1, {from: deployerAddress});
        assert.equal(
            p1claimable.length,
            1,
            "there should only be one claimable reward."
        );
        assert.equal(
            p1claimable[0].token,
            rawrToken.address,
            "token address is incorrect."
        );
        assert.equal(
            p1claimable[0].amount,
            web3.utils.toWei('10000', 'ether'),
            "claimable amount for player 1 is incorrect."
        );

        assert.equal(await feesEscrow.totalFees(rawrToken.address), web3.utils.toWei('10000', 'ether'), "Total fees incorrect.");
    });
    
    it('Test claimable for 2 stakers', async () => {
        await setup();

        // add 2 stakers
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});
        await staking.stake(web3.utils.toWei('75', 'ether'), {from: staker2});

        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
        
        var p1claimable = await feesEscrow.getClaimableRewards(staker1, {from: deployerAddress});
        assert.equal(
            p1claimable[0].amount,
            web3.utils.toWei('2500', 'ether'),
            "claimable amount for player 1 is incorrect."
        );
        
        var p2claimable = await feesEscrow.getClaimableRewards(staker2, {from: deployerAddress});
        assert.equal(
            p2claimable[0].amount,
            web3.utils.toWei('7500', 'ether'),
            "claimable amount for player 2 is incorrect."
        );

        assert.equal(await feesEscrow.totalFees(rawrToken.address), web3.utils.toWei('10000', 'ether'), "Total fees incorrect.");
    });
    
    it('Test claimable for 2 stakers at different times', async () => {
        await setup();

        // add 2 stakers
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});
        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        
        await staking.stake(web3.utils.toWei('75', 'ether'), {from: staker2});
        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});
        
        var p1claimable = await feesEscrow.getClaimableRewards(staker1, {from: deployerAddress});
        assert.equal(
            p1claimable[0].amount,
            web3.utils.toWei('12500', 'ether'),
            "claimable amount for player 1 is incorrect."
        );
        
        var p2claimable = await feesEscrow.getClaimableRewards(staker2, {from: deployerAddress});
        assert.equal(
            p2claimable[0].amount,
            web3.utils.toWei('7500', 'ether'),
            "claimable amount for player 2 is incorrect."
        );

        assert.equal(await feesEscrow.totalFees(rawrToken.address), web3.utils.toWei('20000', 'ether'), "Total fees incorrect.");
    });

    it('Distribute Multiple Token Royalties', async () => {
        await setup();

        // Create a 2nd token
        var rawrV2Token = await RawrToken.new();
        await rawrV2Token.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Stakers
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});
        await staking.stake(web3.utils.toWei('75', 'ether'), {from: staker2});

        // Deposit 10,000 of Rawr token fees
        await feesEscrow.depositFees(rawrToken.address, 10000, {from: deployerAddress});
        
        // Deposit 10,000 of RawrV2 token fees
        await feesEscrow.depositFees(rawrV2Token.address, 20000, {from: deployerAddress});

        var p1claimable = await feesEscrow.getClaimableRewards(staker1, {from: deployerAddress});
        assert.equal(
            p1claimable.length,
            2,
            "there should now be two claimable reward tokens."
        );
        assert.equal(
            p1claimable[0].amount,
            2500,
            "claimable amount for token 1 for player 1 is incorrect."
        );
        assert.equal(
            p1claimable[1].amount,
            5000,
            "claimable amount for token 2 for player 1 is incorrect."
        );
        
        var p2claimable = await feesEscrow.getClaimableRewards(staker2, {from: deployerAddress});
        assert.equal(
            p2claimable.length,
            2,
            "there should now be two claimable reward tokens."
        );
        assert.equal(
            p2claimable[0].amount,
            7500,
            "claimable amount for token 1 for player 2 is incorrect."
        );
        assert.equal(
            p2claimable[1].amount,
            15000,
            "claimable amount for token 2 for player 2 is incorrect."
        );
    });

    it('Claim Fees', async () => {
        await setup();

        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // add stakers - this calls staking().initializeTokenRate()
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});

        // Update internal deposits
        await rawrToken.transfer(feesEscrow.address, web3.utils.toWei('20000', 'ether'), {from: playerAddress});
        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            web3.utils.toWei('20000', 'ether'),
            "fee escrow balance should be 20000 rawr tokens"
        );
        assert.equal(await feesEscrow.totalFees(rawrToken.address), web3.utils.toWei('20000', 'ether'), "Total fees incorrect.");

        // Note: the Staking contract will call UpdateUserRewards() before calling claimRewards()
        await feesEscrow.updateUserRewards(staker1, {from: deployerAddress});
        await feesEscrow.claimRewards(staker1, {from: deployerAddress});
        assert.equal(
            await rawrToken.balanceOf(staker1),
            web3.utils.toWei('20000', 'ether'),
            "Staker1 balance should be 20000 rawr tokens"
        );
        assert.equal(await feesEscrow.totalFees(rawrToken.address), 0, "Total fees incorrect.");

        var p1claimable = await feesEscrow.getClaimableRewards(staker1, {from: deployerAddress});
        assert.equal(
            p1claimable.length,
            1,
            "there should only be one token reward."
        );
        assert.equal(
            p1claimable[0].amount,
           0,
            "claimable amount for player 1 should be 0."
        );
    });

    it('Claim Multiple Token Royalties', async () => {
        await setup();

        // Create a 2nd token
        var rawrV2Token = await RawrToken.new();
        await rawrV2Token.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        await rawrToken.transfer(playerAddress, 20000, {from: deployerAddress});
        await rawrV2Token.transfer(playerAddress, 20000, {from: deployerAddress});

        // Stakers
        await staking.stake(web3.utils.toWei('25', 'ether'), {from: staker1});

        // Deposit 10,000
        await rawrToken.transfer(feesEscrow.address, 10000, {from: playerAddress});
        await feesEscrow.depositFees(rawrToken.address, 10000, {from: deployerAddress});
        
        // Deposit 20,000
        await rawrV2Token.transfer(feesEscrow.address, 20000, {from: playerAddress});
        await feesEscrow.depositFees(rawrV2Token.address, 20000, {from: deployerAddress});

        assert.equal(await feesEscrow.totalFees(rawrToken.address), 10000, "Total fees incorrect.");
        assert.equal(await feesEscrow.totalFees(rawrV2Token.address), 20000, "Total fees incorrect.");

        // Note: the Staking contract will call UpdateUserRewards() before calling claimRewards()
        await feesEscrow.updateUserRewards(staker1, {from: deployerAddress});
        await feesEscrow.claimRewards(staker1, {from: deployerAddress});

        assert.equal(
            await rawrToken.balanceOf(staker1),
            10000,
            "Staker1 balance should be 20000 rawr tokens"
        );
        assert.equal(
            await rawrV2Token.balanceOf(staker1),
            20000,
            "Staker1 balance should be 20000 rawr2 tokens"
        );
    });
});
