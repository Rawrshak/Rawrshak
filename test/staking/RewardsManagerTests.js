const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const StakingRewardsPool = artifacts.require("StakingRewardsPool");
const LockedStakingRewardsPool = artifacts.require("LockedStakingRewardsPool");
const ExchangeRewardsPool = artifacts.require("ExchangeRewardsPool");
const LockedExchangeRewardsPool = artifacts.require("LockedExchangeRewardsPool");
const Staking = artifacts.require("Staking");
const RewardsManager = artifacts.require("RewardsManager");
const ExchangeFeePool = artifacts.require("ExchangeFeePool");
const TruffleAssert = require("truffle-assertions")

contract('Rewards Manager Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,             // address with manager capabilities
        managerAddress2,            // address with manager capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var rawrId = "0xd4df6855";
    var rawrToken;
    var stakingRewardsPool;
    var lockedStakingRewardsPool;
    var exchangeRewardsPool;
    var lockedExchangeRewardsPool;
    var staking;
    var rewardsManager;
    var feePool;

    // Note: This is identical to the FundBase Tests
    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        stakingRewardsPool = await StakingRewardsPool.new();
        await stakingRewardsPool.__StakingRewardsPool_init(rawrToken.address);
        
        lockedStakingRewardsPool = await LockedStakingRewardsPool.new();
        await lockedStakingRewardsPool.__LockedStakingRewardsPool_init(
            rawrToken.address,
            stakingRewardsPool.address,
            web3.utils.toWei('200000000', 'ether'),
            web3.utils.toWei('0.003512337636941769', 'ether'), // 20%
            web3.utils.toWei('0.000012044020616142', 'ether'), // 18%/260 
            260
            );
        
        // lock tokens into contract
        await rawrToken.transfer(lockedStakingRewardsPool.address, web3.utils.toWei('200000000', 'ether'), {from: deployerAddress});
        await rawrToken.grantRole(await rawrToken.MINTER_ROLE(), lockedStakingRewardsPool.address, {from: deployerAddress});

        // set manager role for manager address
        await stakingRewardsPool.registerManager(lockedStakingRewardsPool.address, {from: deployerAddress});
        
        // Exchange Rewards Pool
        exchangeRewardsPool = await ExchangeRewardsPool.new();
        await exchangeRewardsPool.__ExchangeRewardsPool_init(rawrToken.address);
        
        lockedExchangeRewardsPool = await LockedExchangeRewardsPool.new();
        await lockedExchangeRewardsPool.__LockedExchangeRewardsPool_init(
            rawrToken.address,
            exchangeRewardsPool.address
            );

        // set manager role for manager address
        await exchangeRewardsPool.registerManager(lockedExchangeRewardsPool.address, {from: deployerAddress});

        staking = await Staking.new();
        await staking.__Staking_init(rawrToken.address, stakingRewardsPool.address, exchangeRewardsPool.address);

        // Register Staking as a manager for the rewards pools
        await stakingRewardsPool.registerManager(staking.address, {from: deployerAddress});
        await exchangeRewardsPool.registerManager(staking.address, {from: deployerAddress});

        // Player 1 and 2 tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('50000000', 'ether'), {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('50000000', 'ether'), {from: deployerAddress});

        // Set up exchange fee pool and deposit 1,000,000 tokens
        feePool = await ExchangeFeePool.new();
        await feePool.__ExchangeFeePool_init(200, {from: deployerAddress});
        await feePool.registerManager(deployerAddress, {from:deployerAddress});
        await feePool.updateDistributionFunds([lockedExchangeRewardsPool.address], [10000]);
        await rawrToken.transfer(feePool.address, web3.utils.toWei('500000', 'ether'), {from: deployerAddress});
        await feePool.depositRoyalty(rawrId, rawrToken.address, web3.utils.toWei('500000', 'ether'), {from: deployerAddress});

        // Rewards manager
        rewardsManager = await RewardsManager.new();
        await rewardsManager.__RewardsManager_init(
            staking.address,
            lockedStakingRewardsPool.address,
            lockedExchangeRewardsPool.address,
            feePool.address
            );
        await feePool.registerManager(rewardsManager.address, {from:deployerAddress});

        await lockedStakingRewardsPool.transferOwnership(rewardsManager.address, {from: deployerAddress});
        await lockedExchangeRewardsPool.transferOwnership(rewardsManager.address, {from: deployerAddress});
    });

    it('Supports the Rewards Manager Interface', async () => {
        // _INTERFACE_ID_REWARDS_MANAGER = 0x00000014
        assert.equal(
            await rewardsManager.supportsInterface("0x00000014"),
            true, 
            "the contract doesn't support the RewardsManager interface");
    });

    it('Check Default variables', async () => {
        assert.equal(await rewardsManager.stakingInterval(), 0, "Incorrect staking interval");
    });

    it('Reload Staking', async () => {
        // Staking pool currently has 200000000 locked tokens
        assert.equal(await lockedStakingRewardsPool.lockedSupply(), web3.utils.toWei('200000000', 'ether'), "Staking supply value incorrect");
        
        // Mint 5000000 tokens and send to staking rewards pool
        await rewardsManager.reloadStaking(web3.utils.toWei('50000000', 'ether'), {from: deployerAddress});
        
        // check new supply 50,000,000 + 200,000,000
        assert.equal(await lockedStakingRewardsPool.lockedSupply(), web3.utils.toWei('250000000', 'ether'), "New Staking supply value incorrect");
        
        // check total rawrToken 50,000,000 + 1,000,000,000
        assert.equal(await rawrToken.totalSupply(), web3.utils.toWei('1050000000', 'ether'), "New Staking supply value incorrect");
    });

    it('Distribute Exchange Fees', async () => {
        // Locked exchange fee pool currently has 0 locked tokens
        assert.equal(await lockedExchangeRewardsPool.lockedSupply(), web3.utils.toWei('0', 'ether'), "Locked Exchange supply value incorrect");
        
        // Check Exchange Fee Pool at 1,000,000 tokens
        assert.equal(await feePool.totalFeePool(rawrId), web3.utils.toWei('500000', 'ether'), "Exchange Royalty contract is incorrect");
        
        // Distribute the royalty fees to the locked exchange contract
        await rewardsManager.distributeExchangeFees({from: deployerAddress});

        assert.equal(await feePool.totalFeePool(rawrId), web3.utils.toWei('0', 'ether'), "Exchange Royalty contract is incorrect");
        
        // Locked exchange fee pool now has a 1000000 tokens
        assert.equal(await lockedExchangeRewardsPool.lockedSupply(), web3.utils.toWei('500000', 'ether'), "New Locked Exchange supply value incorrect");
    });

    it('Finish current staking interval and start next staking interval', async () => {
        // deposits
        await rawrToken.approve(staking.address, web3.utils.toWei('500000', 'ether'), {from:playerAddress});
        await rawrToken.approve(staking.address, web3.utils.toWei('500000', 'ether'), {from:player2Address});
        await staking.deposit(web3.utils.toWei('500000', 'ether'), {from: playerAddress});
        await staking.deposit(web3.utils.toWei('500000', 'ether'), {from: player2Address});

        // check staking contract total
        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('1000000', 'ether'), "Incorrect Staking amount");        

        // check exchange contract total
        assert.equal(await lockedExchangeRewardsPool.lockedSupply(), web3.utils.toWei('0', 'ether'), "Locked Exchange Fees in contract is incorrect");
        
        // distribute exchange fees
        await rewardsManager.distributeExchangeFees({from: deployerAddress});

        // Trigger Next Interval
        await rewardsManager.nextStakingInterval();

        assert.equal(await rewardsManager.stakingInterval(), 1, "Incorrect Staking Interval");
        
        assert.equal((await staking.totalClaimableTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total claimable tokens in interval");
        assert.equal((await staking.unclaimedTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total unclaimed tokens in interval");

        // check how much each contract owns
        assert.equal(await rawrToken.balanceOf(staking.address), web3.utils.toWei('1000000', 'ether'), "Staking Contract owns an incorrect amount of staked tokens.");
        assert.equal(await rawrToken.balanceOf(stakingRewardsPool.address), web3.utils.toWei('3512.337636941769', 'ether'), "Unlocked tokens in the Staking Contract is incorrect.");
        assert.equal(await rawrToken.balanceOf(exchangeRewardsPool.address), web3.utils.toWei('500000', 'ether'), "Incorrect amount of exchange rewards pool unlocked");
        
    });

});
