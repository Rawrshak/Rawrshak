const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const TruffleAssert = require("truffle-assertions");

contract('Exchange Fees Escrow Contract tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        executionManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        playerAddress,              // Player Address
        stakingFund,                // Staking Fund contract
        daoFund,                    // DAO fund contract
        charityFund                 // Charity fund contract
    ] = accounts;
    
    var rawrId = "0xd4df6855";
    var rawrToken;
    var escrow;
    var feesEscrow;

    // roles
    var manager_role;
    var default_admin_role;

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        feesEscrow = await ExchangeFeesEscrow.new();
        await feesEscrow.__ExchangeFeesEscrow_init(20000, {from: deployerAddress});
    });

    it('Check if ExchangeFeesEscrow was deployed properly', async () => {
        assert.equal(
            feesEscrow.address != 0x0,
            true,
            "Exchange Fee Pool was not deployed properly.");
    });

    it('Supports the ExchangeFeesEscrow Interface', async () => {
        // INTERFACE_ID_LibContractHash.CONTRACT_EXCHANGE_FEE_POOL = 0x00000012
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

    it('Deployer wallet must not have manager role', async () => {
        manager_role = await feesEscrow.MANAGER_ROLE();
        assert.equal(
            await feesEscrow.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet should not have the manager role");
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
        await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress})

        assert.equal(
            await feesEscrow.rate(),
            20000, 
            "initial Exchange Fees rate is incorrect.");

        TruffleAssert.eventEmitted(
            await feesEscrow.setRate(30000, {from:executionManagerAddress}),
            'FeeUpdated'
        );
        assert.equal(
            await feesEscrow.rate(),
            30000, 
            "updated Exchange Fees rate is incorrect.");
    });
    
    it('Update funds for fee pool distribution', async () => {
        // Register the execution manager
        await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress})

        // add funds
        await feesEscrow.updateDistributionPools([stakingFund, daoFund], [500000, 500000], {from:executionManagerAddress});
        
        var currentRates = await feesEscrow.distributionRates();

        assert.equal(currentRates[0][0], stakingFund, "staking fund address missing");
        assert.equal(currentRates[0][1], daoFund, "dao fund address missing");
        assert.equal(currentRates[1][0], 500000, "staking fund rate incorrect");
        assert.equal(currentRates[1][1], 500000, "dao fund rate incorrect");

        TruffleAssert.eventEmitted(
            await feesEscrow.updateDistributionPools([stakingFund, daoFund, charityFund], [300000, 300000, 400000], {from:executionManagerAddress}),
            'PoolsUpdated'
        );
        
        currentRates = await feesEscrow.distributionRates();
        assert.equal(currentRates[0][0], stakingFund, "staking fund address missing");
        assert.equal(currentRates[0][1], daoFund, "dao fund address missing");
        assert.equal(currentRates[0][2], charityFund, "charity fund address missing");
        assert.equal(currentRates[1][0], 300000, "staking fund rate incorrect");
        assert.equal(currentRates[1][1], 300000, "dao fund rate incorrect");
        assert.equal(currentRates[1][2], 400000, "charity fund rate incorrect");
    });
    
    it('Invalid update pools', async () => {
        // Register the execution manager
        await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress})
        
        await TruffleAssert.fails(
            feesEscrow.updateDistributionPools([], [], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            feesEscrow.updateDistributionPools([stakingFund, daoFund], [300000, 300000, 400000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            feesEscrow.updateDistributionPools([stakingFund, daoFund, charityFund], [300000, 300000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            feesEscrow.updateDistributionPools([stakingFund, daoFund, charityFund], [300000, 300000, 500000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            feesEscrow.updateDistributionPools([stakingFund, daoFund, charityFund], [300000, 300000, 300000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
    
    it('Deposit Royalties', async () => {
        // Register the execution manager
        await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress})

        TruffleAssert.eventEmitted(
            await feesEscrow.depositRoyalty(rawrToken.address, 10000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feesEscrow.totalFeePool(rawrToken.address), 10000, "Total fee pool incorrect.");
        
        TruffleAssert.eventEmitted(
            await feesEscrow.depositRoyalty(rawrToken.address, 5000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feesEscrow.totalFeePool(rawrToken.address), 15000, "Total fee pool incorrect.");
    });
    
    it('Deposit Multiple Token Royalties', async () => {
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
            await feesEscrow.depositRoyalty(rawrToken.address, 10000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );
        
        // Deposit 10,000 of RawrV2 token fees
        await rawrV2Token.transfer(feesEscrow.address, 10000, {from: playerAddress});
        TruffleAssert.eventEmitted(
            await feesEscrow.depositRoyalty(rawrV2Token.address, 10000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );
        
        // Check Escrow fees for both tokens
        assert.equal(await feesEscrow.totalFeePool(rawrToken.address), 10000, "Total fee pool incorrect for Rawr Token");
        assert.equal(await feesEscrow.totalFeePool(rawrV2Token.address), 10000, "Total fee pool incorrect for Rawr V2 token");
    });
    
    it('Distribute fee pool to funds', async () => {
        await setup();

        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        await rawrToken.transfer(feesEscrow.address, 10000, {from: playerAddress});
        await feesEscrow.depositRoyalty(rawrToken.address, 10000, {from: executionManagerAddress});

        TruffleAssert.eventEmitted(
            await feesEscrow.distribute({from: executionManagerAddress}),
            'PoolsDistributed'
        );
        
        assert.equal(
            await rawrToken.balanceOf(stakingFund),
            5000,
            "Fees were not distributed to the Staking Fund"
        );
        assert.equal(
            await rawrToken.balanceOf(daoFund),
            5000,
            "Fees were not distributed to the DAO Fund"
        );
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            0,
            "fee pool balance is not zero"
        );

        assert.equal(await feesEscrow.totalFeePool(rawrToken.address), 0, "Total fee pool incorrect.");
    });

    it('Distribute Multiple Token Royalties', async () => {
        // Create a 2nd token
        var rawrV2Token = await RawrToken.new();
        await rawrV2Token.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        // Give tokens to Player
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
        await rawrV2Token.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        await setup();

        // Deposit 10,000 of Rawr token fees
        await rawrToken.transfer(feesEscrow.address, 10000, {from: playerAddress});
        await feesEscrow.depositRoyalty(rawrToken.address, 10000, {from: executionManagerAddress});
        
        // Deposit 10,000 of RawrV2 token fees
        await rawrV2Token.transfer(feesEscrow.address, 10000, {from: playerAddress});
        await feesEscrow.depositRoyalty(rawrV2Token.address, 10000, {from: executionManagerAddress});
        

        TruffleAssert.eventEmitted(
            await feesEscrow.distribute({from: executionManagerAddress}),
            'PoolsDistributed'
        );
        
        // check RAWR token
        assert.equal(
            await rawrToken.balanceOf(stakingFund),
            5000,
            "Fees were not distributed to the Staking Fund"
        );
        assert.equal(
            await rawrToken.balanceOf(daoFund),
            5000,
            "Fees were not distributed to the DAO Fund"
        );
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            0,
            "fee pool balance is not zero"
        );
        
        // Check RAWR V2 token
        assert.equal(
            await rawrV2Token.balanceOf(stakingFund),
            5000,
            "Fees were not distributed to the Staking Fund"
        );
        assert.equal(
            await rawrV2Token.balanceOf(daoFund),
            5000,
            "Fees were not distributed to the DAO Fund"
        );
        assert.equal(
            await rawrV2Token.balanceOf(feesEscrow.address),
            0,
            "fee pool balance is not zero"
        );
    });
    
    it('Invalid Fee pool distribution', async () => {
        await setup();

        // funds is equal to zero
        await TruffleAssert.fails(
            feesEscrow.distribute({from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // internal fee pool balance is greater than what the contract holds
        await feesEscrow.depositRoyalty(rawrToken.address, 10000, {from: executionManagerAddress});
        await TruffleAssert.fails(
            feesEscrow.distribute({from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });


    async function setup() {
        // Register the execution manager
        await feesEscrow.registerManager(executionManagerAddress, {from:deployerAddress})

        // add funds
        await feesEscrow.updateDistributionPools([stakingFund, daoFund], [500000, 500000], {from:executionManagerAddress});
    }
});
