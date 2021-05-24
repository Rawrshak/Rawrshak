const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const ExchangeFeePool = artifacts.require("ExchangeFeePool");
const TruffleAssert = require("truffle-assertions");

contract('Exchange Fee Pool Contract', (accounts) => {
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
    var feePool;
    var manager_role;
    var default_admin_role;

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        feePool = await ExchangeFeePool.new();
        await feePool.__ExchangeFeePool_init(200, {from: deployerAddress});

        manager_role = await feePool.MANAGER_ROLE();
        default_admin_role = await feePool.DEFAULT_ADMIN_ROLE();

        // Register the execution manager
        await feePool.registerManager(executionManagerAddress, {from:deployerAddress})

        // add funds
        await feePool.updateDistributionFunds([stakingFund, daoFund], [5000, 5000], {from:executionManagerAddress});

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    });

    it('Check if ExchangeFeePool was deployed properly', async () => {
        assert.equal(
            feePool.address != 0x0,
            true,
            "Exchange Fee Pool was not deployed properly.");
    });

    it('Supports the ExchangeFeePool Interface', async () => {
        // _INTERFACE_ID_EXCHANGE_FEE_POOL = 0x00000012
        assert.equal(
            await feePool.supportsInterface("0x00000012"),
            true, 
            "the contract doesn't support the ExchangeFeePool interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        assert.equal(
            await feePool.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Deployer wallet must not have manager role', async () => {
        assert.equal(
            await feePool.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet should not have the manager role");
    });
    
    it('Registering Manager address', async () => {        
        TruffleAssert.eventEmitted(
            await feePool.registerManager(royaltiesManagerAddress, {from:deployerAddress}),
            'ManagerRegistered'
        );

        assert.equal(
            await feePool.hasRole(
                manager_role,
                executionManagerAddress),
            true, 
            "execution manager should have the manager role");

        assert.equal(
            await feePool.hasRole(
                manager_role,
                royaltiesManagerAddress),
            true, 
            "royalties manager should have the manager role");
    });
    
    it('Update Rate', async () => {
        assert.equal(
            await feePool.rate(),
            200, 
            "initial Exchange Fees rate is incorrect.");

        TruffleAssert.eventEmitted(
            await feePool.setRate(300, {from:executionManagerAddress}),
            'FeeUpdated'
        );
        assert.equal(
            await feePool.rate(),
            300, 
            "updated Exchange Fees rate is incorrect.");
    });
    
    it('Update funds for fee pool distribution', async () => {
        var currentRates = await feePool.distributionRates();

        assert.equal(currentRates[0][0], stakingFund, "staking fund address missing");
        assert.equal(currentRates[0][1], daoFund, "dao fund address missing");
        assert.equal(currentRates[1][0], 5000, "staking fund rate incorrect");
        assert.equal(currentRates[1][1], 5000, "dao fund rate incorrect");

        TruffleAssert.eventEmitted(
            await feePool.updateDistributionFunds([stakingFund, daoFund, charityFund], [3000, 3000, 4000], {from:executionManagerAddress}),
            'FundsUpdated'
        );
        
        currentRates = await feePool.distributionRates();
        assert.equal(currentRates[0][0], stakingFund, "staking fund address missing");
        assert.equal(currentRates[0][1], daoFund, "dao fund address missing");
        assert.equal(currentRates[0][2], charityFund, "charity fund address missing");
        assert.equal(currentRates[1][0], 3000, "staking fund rate incorrect");
        assert.equal(currentRates[1][1], 3000, "dao fund rate incorrect");
        assert.equal(currentRates[1][2], 4000, "dao fund rate incorrect");
    });
    
    it('Invalid update funds', async () => {
        
        await TruffleAssert.fails(
            feePool.updateDistributionFunds([], [], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            feePool.updateDistributionFunds([stakingFund, daoFund], [3000, 3000, 4000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            feePool.updateDistributionFunds([stakingFund, daoFund, charityFund], [3000, 3000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            feePool.updateDistributionFunds([stakingFund, daoFund, charityFund], [3000, 3000, 5000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            feePool.updateDistributionFunds([stakingFund, daoFund, charityFund], [3000, 3000, 3000], {from:executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
    
    it('Deposit Royalties', async () => {
        TruffleAssert.eventEmitted(
            await feePool.depositRoyalty(rawrId, rawrToken.address, 10000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feePool.totalFeePool(rawrId), 10000, "Total fee pool incorrect.");
        
        TruffleAssert.eventEmitted(
            await feePool.depositRoyalty(rawrId, rawrToken.address, 5000, {from: executionManagerAddress}),
            'ExchangeFeesPaid'
        );

        assert.equal(await feePool.totalFeePool(rawrId), 15000, "Total fee pool incorrect.");
    });
    
    it('Distribute fee pool to funds', async () => {

        await rawrToken.transfer(feePool.address, 10000, {from: playerAddress});

        await feePool.depositRoyalty(rawrId, rawrToken.address, 10000, {from: executionManagerAddress});

        TruffleAssert.eventEmitted(
            await feePool.distribute(rawrId, rawrToken.address, {from: executionManagerAddress}),
            'FundsDistributed'
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
            await rawrToken.balanceOf(rawrToken.address),
            0,
            "fee pool balance is not zero"
        );

        assert.equal(await feePool.totalFeePool(rawrId), 0, "Total fee pool incorrect.");
    });
    
    it('Invalid Fee pool distribution', async () => {
        // funds is equal to zero
        await TruffleAssert.fails(
            feePool.distribute(rawrId, rawrToken.address, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        // internal fee pool balance is greater than what the contract holds
        await feePool.depositRoyalty(rawrId, rawrToken.address, 10000, {from: executionManagerAddress});
        await TruffleAssert.fails(
            feePool.distribute(rawrId, rawrToken.address, {from: executionManagerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
