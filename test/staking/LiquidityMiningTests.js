const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const MockToken = artifacts.require("MockToken");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const LiquidityMining = artifacts.require("LiquidityMining");
const TruffleAssert = require("truffle-assertions")
const { BN, time } = require('@openzeppelin/test-helpers');

contract('Liquidity Mining Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        wallet1,
        wallet2,
        wallet3,
        wallet4,
        rescueWallet
    ] = accounts;

    var rawr;
    var mockUSDC;
    var mockUSDT;
    var mockDAI;

    var feesEscrow;
    var resolver;
    var mining;

    beforeEach(async () => {
        rawr = await RawrToken.new();
        await rawr.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        mockUSDC = await MockToken.new();
        await mockUSDC.initialize("USDC", "USDC");
        mockUSDT = await MockToken.new();
        await mockUSDT.initialize("USDT", "USDT");
        mockDAI = await MockToken.new();
        await mockDAI.initialize("DAI", "DAI");

        mining = await LiquidityMining.new();
        await mining.__LiquidityMining_init(
            mockUSDC.address,
            mockUSDT.address,
            mockDAI.address,
            rawr.address,
            {from: deployerAddress});
    });

    async function setup() {
        // 10000 rawr tokens per month, 2500 per week
        await rawr.transfer(mining.address, web3.utils.toWei('10000'), {from: deployerAddress});

        // give wallet some stablecoins
        await mockUSDC.mint(wallet1, web3.utils.toWei('1000'));
        await mockUSDC.mint(wallet2, web3.utils.toWei('1000'));
        await mockUSDT.mint(wallet2, web3.utils.toWei('1000'));
        await mockUSDT.mint(wallet3, web3.utils.toWei('1000'));
        await mockDAI.mint(wallet3, web3.utils.toWei('1000'));
        await mockDAI.mint(wallet4, web3.utils.toWei('1000'));

        // Approve mining contract for all wallets
        await mockUSDC.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet1 });
        await mockUSDC.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet2 });
        await mockUSDT.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet2 });
        await mockUSDT.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet3 });
        await mockDAI.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet3 });
        await mockDAI.approve(mining.address, new BN(2).pow(new BN(255)), { from: wallet4 });
    }

    async function timeIncreaseTo(seconds) {
        const delay = 10 - new Date().getMilliseconds();
        await new Promise(resolve => setTimeout(resolve, delay));
        await time.increaseTo(seconds);
    }

    function almostEqualDiv1e18(expectedOrig, actualOrig) {
        const _1e18 = new BN('10').pow(new BN('18'));
        const expected = new BN(expectedOrig).div(_1e18);
        const actual = new BN(actualOrig).div(_1e18);
        assert.isTrue(
            expected.eq(actual) ||
            expected.addn(1).eq(actual) || expected.addn(2).eq(actual) ||
            actual.addn(1).eq(expected) || actual.addn(2).eq(expected),
            "Almost equal is not true."
        );
    };

    it('Contract Exists', async () => {
        assert.equal(
            mining.address != 0x0,
            true,
            "Mining contract was not deployed properly.");
    });

    it('Test Basic inputs', async () => {
        await setup();

        assert.equal(await mining.totalStake(), 0, "Default total should be zero");
        assert.equal(await mining.totalUserStake(wallet1), 0, "Default user total should be zero");
        assert.equal(await mining.totalRewards(), 0, "Default total rewards should be zero");
        assert.equal(await mining.totalClaimedRewards(), 0, "Default claim total should be zero");
        assert.equal(await mining.startTime(), 0, "Default start time should be zero");
    });

    it('Deposit Tokens', async () => {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60 * 1; // 60 seconds from now
        const endTime = currentTime + 60 * 121; // 2 hours + 1 minute from now

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        // 0 staking yet
        assert.equal(await mining.totalStake(), 0, "Default total should be zero");
        
        // Deposit amount
        assert.equal(await mining.totalRewards(), web3.utils.toWei('10000'), "Default total should be zero");

        // Check the start and end time
        assert.equal(await mining.startTime(), startTime, "Incorrect Start Time");
        assert.equal(await mining.endTime(), endTime, "Incorrect Start Time");
    });

    it('Multiple Token deposits', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60 * 1; // 60 seconds from now
        const endTime = currentTime + 60 * 121; // 2 hours + 1 minute from now

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        await time.increase(time.duration.minutes(2));

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(0, web3.utils.toWei('100'), 0, { from: wallet2 });
        await mining.stake(0, 0, web3.utils.toWei('100'), { from: wallet3 });

        // check staked assets
        assert.equal(await mining.userStakeUsdc(wallet1), web3.utils.toWei('100') , "Wallet 1 stake incorrect");
        assert.equal(await mining.userStakeUsdt(wallet2), web3.utils.toWei('100') , "Wallet 2 stake incorrect");
        assert.equal(await mining.userStakeDai(wallet3), web3.utils.toWei('100') , "Wallet 3 stake incorrect");
        assert.equal(await mining.totalStake(), web3.utils.toWei('300') , "Total Stake is incorrect");
    });
    
    it('Two stakers with the same stakes', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60 * 1; // 60 seconds from now
        const endTime = currentTime + 60 * 121; // 2 hours + 1 minute from now

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        // Staking hasn't started yet
        await TruffleAssert.fails(
            mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 }),
            TruffleAssert.ErrorType.REVERT
        );

        await time.increase(time.duration.minutes(2));

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // check staked assets
        assert.equal(await mining.userStakeUsdc(wallet1), web3.utils.toWei('100') , "Wallet 1 stake incorrect");
        assert.equal(await mining.userStakeUsdc(wallet2), web3.utils.toWei('100') , "Wallet 2 stake incorrect");
        assert.equal(await mining.totalStake(), web3.utils.toWei('200') , "Total Stake is incorrect");
    });
    
    it('Two stakers with the same stakes with payout after duration', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60;
        const endTime = startTime + 60 * 120; // 2 hours

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        // increase to 1 hour
        await time.increase(time.duration.hours(1));

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // time go past end time
        await time.increase(time.duration.hours(2));

        // Payouts
        await mining.payout(wallet1, {from: wallet1});
        await mining.payout(wallet2, {from: wallet2});
        
        // The entire amount was claimed by the end - 'almost' due to rounding errors
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet1), web3.utils.toWei('5000'));
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet2), web3.utils.toWei('5000'));
        almostEqualDiv1e18(await mining.totalClaimedRewards(), web3.utils.toWei('10000'));
    });
    
    it('Two stakers, one comes in 50% duration finished', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60;
        const endTime = startTime + 60 * 120; // 2 hours

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        await time.increaseTo(startTime);
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });

        // increase to 1 hour
        await time.increase(time.duration.hours(1));

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // time go past end time
        await time.increase(time.duration.hours(2));

        // Payouts
        await mining.payout(wallet1, {from: wallet1});
        await mining.payout(wallet2, {from: wallet2});
        
        // The entire amount was claimed by the end - 'almost' due to rounding errors
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet1), web3.utils.toWei('7500'));
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet2), web3.utils.toWei('2500'));
        almostEqualDiv1e18(await mining.totalClaimedRewards(), web3.utils.toWei('10000'));
    });
    
    it('Two stakers, one withdraws half way in', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60;
        const endTime = startTime + 60 * 120; // 2 hours

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        await time.increaseTo(startTime);

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // increase to 1 hour
        await time.increase(time.duration.hours(1));

        // withdraw half way - also does a payout
        await mining.withdraw(wallet2, {from: wallet2});

        // time go past end time
        await time.increase(time.duration.hours(2));

        // Payouts
        await mining.payout(wallet1, {from: wallet1});
        // await mining.payout(wallet2, {from: wallet2});
        
        // The entire amount was claimed by the end - 'almost' due to rounding errors
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet1), web3.utils.toWei('7500'));
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet2), web3.utils.toWei('2500'));
        almostEqualDiv1e18(await mining.totalClaimedRewards(), web3.utils.toWei('10000'));
    });
    
    it('Two stakers, both withdraws half way in', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;

        // Note: Increasing the duration to 4 weeks for granularity for claimed comparisons
        const startTime = currentTime + 60;
        const endTime = startTime + 60 * 60 * 24 * 28; // 4 weeks

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        await time.increaseTo(startTime);

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // increase to 14 days
        await time.increase(time.duration.days(14));

        // withdraw half way - also does a payout
        await mining.withdraw(wallet1, {from: wallet1});
        await mining.withdraw(wallet2, {from: wallet2});

        // time go past end time
        await time.increase(time.duration.days(15));

        // The entire amount was claimed by the end - 'almost' due to rounding errors
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet1), web3.utils.toWei('2500'));
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet2), web3.utils.toWei('2500'));
        almostEqualDiv1e18(await mining.totalClaimedRewards(), web3.utils.toWei('5000'));
    });

    it('Two stakers, both withdraws half way in, rescue remaining tokens', async function () {
        await setup();

        const currentTime = (await web3.eth.getBlock('latest')).timestamp;
        const startTime = currentTime + 60;
        const endTime = startTime + 60 * 60 * 24 * 28; // 4 weeks

        // Deposit rewards
        await mining.deposit(web3.utils.toWei('10000'), startTime, endTime, {from: deployerAddress});

        await time.increaseTo(startTime);

        // Wallet USDC staking
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet1 });
        await mining.stake(web3.utils.toWei('100'), 0, 0, { from: wallet2 });

        // increase to 14 days
        await time.increase(time.duration.days(14));

        // withdraw half way
        await mining.withdraw(wallet1, {from: wallet1});
        await mining.withdraw(wallet2, {from: wallet2});

        // time go past end time
        await time.increase(time.duration.days(15));
        
        // The entire amount was claimed by the end - 'almost' due to rounding errors
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet1), web3.utils.toWei('2500'));
        almostEqualDiv1e18(await mining.userClaimedRewards(wallet2), web3.utils.toWei('2500'));
        
        amountToRescue = await rawr.balanceOf(mining.address);
        await mining.rescueTokens(rawr.address, rescueWallet, amountToRescue.toString());

        // Rawr tokens were rescued
        assert.equal(
            (await rawr.balanceOf(rescueWallet)).toString(),
            amountToRescue.toString(),
            "remaining RAWR tokens were not rescued"
        );
        assert.equal(
            await rawr.balanceOf(mining.address),
            0,
            "mining contract should not be holding anymore tokens"
        );
    });
});
