// const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
// const RawrToken = artifacts.require("RawrToken");
// const MockToken = artifacts.require("MockToken");
// const LiquidityMining = artifacts.require("LiquidityMining");
// const TruffleAssert = require("truffle-assertions")
const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require('@openzeppelin/test-helpers');
const { waffle } = require("hardhat");

describe('Liquidity Mining Contract Tests', () => {
    var deployerAddress,
        wallet1,
        wallet2,
        wallet3,
        wallet4,
        rescueWallet;

    var rawr;
    var mockUSDC;
    var mockUSDT;
    var mockDAI;

    var mining;

    var provider;

    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {            
        [deployerAddress,
            wallet1,
            wallet2,
            wallet3,
            wallet4,
            rescueWallet            
        ] = await ethers.getSigners();
        
        LiquidityMining = await ethers.getContractFactory("LiquidityMining");
        RawrToken = await ethers.getContractFactory("RawrToken");
        MockToken = await ethers.getContractFactory("MockToken");

        provider = waffle.provider;
    });

    beforeEach(async () => {
        rawrToken = await upgrades.deployProxy(RawrToken, [ethers.BigNumber.from(100000000).mul(_1e18)]);

        mockUSDC = await upgrades.deployProxy(MockToken, ["USDC", "USDC"]);
        mockUSDT = await upgrades.deployProxy(MockToken, ["USDT", "USDT"]);
        mockDAI = await upgrades.deployProxy(MockToken, ["DAI", "DAI"]);

        mining = await upgrades.deployProxy(LiquidityMining, [mockUSDC.address, mockUSDT.address, mockDAI.address, rawrToken.address]);
    });

    async function setup() {
        // 10000 rawr tokens per month, 2500 per week
        await rawrToken.transfer(mining.address, ethers.BigNumber.from(10000).mul(_1e18));

        // give wallet some stablecoins
        await mockUSDC.mint(wallet1.address, ethers.BigNumber.from(10000).mul(_1e18));
        await mockUSDC.mint(wallet2.address, ethers.BigNumber.from(10000).mul(_1e18));
        await mockUSDT.mint(wallet2.address, ethers.BigNumber.from(10000).mul(_1e18));
        await mockUSDT.mint(wallet3.address, ethers.BigNumber.from(10000).mul(_1e18));
        await mockDAI.mint(wallet3.address, ethers.BigNumber.from(10000).mul(_1e18));
        await mockDAI.mint(wallet4.address, ethers.BigNumber.from(10000).mul(_1e18));

        // Approve mining contract for all wallets
        await mockUSDC.connect(wallet1).approve(mining.address, ethers.constants.MaxUint256);
        await mockUSDC.connect(wallet2).approve(mining.address, ethers.constants.MaxUint256);
        await mockUSDT.connect(wallet2).approve(mining.address, ethers.constants.MaxUint256);
        await mockUSDT.connect(wallet3).approve(mining.address, ethers.constants.MaxUint256);
        await mockDAI.connect(wallet3).approve(mining.address, ethers.constants.MaxUint256);
        await mockDAI.connect(wallet4).approve(mining.address, ethers.constants.MaxUint256);
    }

    async function timeIncreaseTo(seconds) {
        const delay = 10 - new Date().getMilliseconds();
        await new Promise(resolve => setTimeout(resolve, delay));
        await time.increaseTo(seconds);
    }

    // function almostEqualDiv1e18(expectedOrig, actualOrig) {
    //     const expected = new BN(expectedOrig).div(_1e18);
    //     const actual = new BN(actualOrig).div(_1e18);
    //     assert.isTrue(
    //         expected.eq(actual) ||
    //         expected.addn(1).eq(actual) || expected.addn(2).eq(actual) ||
    //         actual.addn(1).eq(expected) || actual.addn(2).eq(expected),
    //         "Almost equal is not true."
    //     );
    // };

    describe("Basic Tests", () => {
        it('Contract Exists', async () => {
            expect(mining.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Test Basic inputs', async () => {
            await setup();
    
            expect(await mining.totalStake()).is.equal(0);
            expect(await mining.totalUserStake(wallet1.address)).is.equal(0);
            expect(await mining.totalRewards()).is.equal(0);
            expect(await mining.totalClaimedRewards()).is.equal(0);
            expect(await mining.startTime()).is.equal(0);
        });
    });

    describe("Reward Deposit", () => {
        it('Deposit Tokens', async () => {
            await setup();

            var currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now

            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);

            // 0 staking yet
            expect(await mining.totalStake()).is.equal(0);
            
            // Deposit amount
            expect(await mining.totalRewards()).is.equal(ethers.BigNumber.from(10000).mul(_1e18));

            // Check the start and end time
            expect(await mining.startTime()).is.equal(startTime);
            expect(await mining.endTime()).is.equal(endTime);
        });

        it('Multiple Token deposits', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            await time.increase(time.duration.minutes(2));
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(0, ethers.BigNumber.from(100).mul(_1e18), 0);
            await mining.connect(wallet3).stake(0, 0, ethers.BigNumber.from(100).mul(_1e18));

            // check staked assets
            expect(await mining.userStakeUsdc(wallet1.address)).is.equal(ethers.BigNumber.from(100).mul(_1e18));
            expect(await mining.userStakeUsdt(wallet2.address)).is.equal(ethers.BigNumber.from(100).mul(_1e18));
            expect(await mining.userStakeDai(wallet3.address)).is.equal(ethers.BigNumber.from(100).mul(_1e18));
            expect(await mining.totalStake()).is.equal(ethers.BigNumber.from(300).mul(_1e18));
        });
    });

    describe("Staking", () => {
        it('Two stakers with the same stakes', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            // Staking hasn't started yet
            await expect(mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18))).to.be.reverted;
    
            await time.increase(time.duration.minutes(2));
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);

            // check staked assets
            expect(await mining.userStakeUsdc(wallet1.address)).is.equal(ethers.BigNumber.from(100).mul(_1e18));
            expect(await mining.userStakeUsdc(wallet2.address)).is.equal(ethers.BigNumber.from(100).mul(_1e18));
            expect(await mining.totalStake()).is.equal(ethers.BigNumber.from(200).mul(_1e18));
        });
    
        it('Two stakers with the same stakes with payout after duration', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            // increase to 1 hour
            await time.increase(time.duration.hours(1));
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // time go past end time
            await time.increase(time.duration.hours(2));
    
            // Payouts
            await mining.connect(wallet1).payout(wallet1.address);
            await mining.connect(wallet2).payout(wallet2.address);
            
            // The entire amount was claimed by the end - 'almost' due to rounding errors
            expect(await mining.userClaimedRewards(wallet1.address)).to.be.within(ethers.BigNumber.from(4998).mul(_1e18), ethers.BigNumber.from(5002).mul(_1e18));
            expect(await mining.userClaimedRewards(wallet2.address)).to.be.within(ethers.BigNumber.from(4998).mul(_1e18), ethers.BigNumber.from(5002).mul(_1e18));
            expect(await mining.totalClaimedRewards()).to.be.closeTo(ethers.BigNumber.from(10000).mul(_1e18), _1e18);
        });
    
        it('Two stakers, one comes in 50% duration finished', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            await time.increaseTo(startTime);
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // increase to 1 hour
            await time.increase(time.duration.hours(1));
    
            // Wallet USDC staking
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // time go past end time
            await time.increase(time.duration.hours(2));
    
            // Payouts
            await mining.connect(wallet1).payout(wallet1.address);
            await mining.connect(wallet2).payout(wallet2.address);
            
            // The entire amount was claimed by the end - 'almost' due to rounding errors
            expect(await mining.userClaimedRewards(wallet1.address)).to.be.within(ethers.BigNumber.from(7498).mul(_1e18), ethers.BigNumber.from(7502).mul(_1e18));
            expect(await mining.userClaimedRewards(wallet2.address)).to.be.within(ethers.BigNumber.from(2498).mul(_1e18), ethers.BigNumber.from(2502).mul(_1e18));
            expect(await mining.totalClaimedRewards()).to.be.closeTo(ethers.BigNumber.from(10000).mul(_1e18), _1e18);
        });
    
        it('Two stakers, one withdraws half way in', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60 * 1; // 60 seconds from now
            const endTime = startTime + 60 * 120; // 2 hours + 1 minute from now
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            await time.increaseTo(startTime);
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // increase to 1 hour
            await time.increase(time.duration.hours(1));
    
            // withdraw half way - also does a payout
            await mining.connect(wallet2).withdraw(wallet2.address);
    
            // time go past end time
            await time.increase(time.duration.hours(2));
    
            // Payouts
            await mining.connect(wallet1).payout(wallet1.address);
            
            // The entire amount was claimed by the end - 'almost' due to rounding errors
            expect(await mining.userClaimedRewards(wallet1.address)).to.be.within(ethers.BigNumber.from(7498).mul(_1e18), ethers.BigNumber.from(7502).mul(_1e18));
            expect(await mining.userClaimedRewards(wallet2.address)).to.be.within(ethers.BigNumber.from(2498).mul(_1e18), ethers.BigNumber.from(2502).mul(_1e18));
            expect(await mining.totalClaimedRewards()).to.be.closeTo(ethers.BigNumber.from(10000).mul(_1e18), _1e18);
        });
    
        it('Two stakers, both withdraws half way in', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
    
            // Note: Increasing the duration to 4 weeks for granularity for claimed comparisons
            const startTime = currentTime + 60;
            const endTime = startTime + 60 * 60 * 24 * 28; // 4 weeks
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            await time.increaseTo(startTime);
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // increase to 14 days
            await time.increase(time.duration.days(14));
    
            // withdraw half way - also does a payout
            await mining.connect(wallet1).withdraw(wallet1.address);
            await mining.connect(wallet2).withdraw(wallet2.address);
    
            // time go past end time
            await time.increase(time.duration.days(15));
    
            // The entire amount was claimed by the end - 'almost' due to rounding errors
            expect(await mining.userClaimedRewards(wallet1.address)).to.be.within(ethers.BigNumber.from(2499).mul(_1e18), ethers.BigNumber.from(2501).mul(_1e18));
            expect(await mining.userClaimedRewards(wallet2.address)).to.be.within(ethers.BigNumber.from(2499).mul(_1e18), ethers.BigNumber.from(2501).mul(_1e18));
            expect(await mining.totalClaimedRewards()).to.be.closeTo(ethers.BigNumber.from(5000).mul(_1e18), _1e18);
        });
    
        it('Two stakers, both withdraws half way in, rescue remaining tokens', async function () {
            await setup();
    
            currentBlock = await provider.getBlockNumber();
            const currentTime = (await provider.getBlock(currentBlock)).timestamp;
            const startTime = currentTime + 60;
            const endTime = startTime + 60 * 60 * 24 * 28; // 4 weeks
    
            // Deposit rewards
            await mining.deposit(ethers.BigNumber.from(10000).mul(_1e18), startTime, endTime);
    
            await time.increaseTo(startTime);
    
            // Wallet USDC staking
            await mining.connect(wallet1).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
            await mining.connect(wallet2).stake(ethers.BigNumber.from(100).mul(_1e18), 0, 0);
    
            // increase to 14 days
            await time.increase(time.duration.days(14));
    
            // withdraw half way
            await mining.connect(wallet1).withdraw(wallet1.address);
            await mining.connect(wallet2).withdraw(wallet2.address);
    
            // time go past end time
            await time.increase(time.duration.days(15));
            
            // The entire amount was claimed by the end - 'almost' due to rounding errors
            expect(await mining.userClaimedRewards(wallet1.address)).to.be.within(ethers.BigNumber.from(2499).mul(_1e18), ethers.BigNumber.from(2501).mul(_1e18));
            expect(await mining.userClaimedRewards(wallet2.address)).to.be.within(ethers.BigNumber.from(2499).mul(_1e18), ethers.BigNumber.from(2501).mul(_1e18));
            
            amountToRescue = await rawrToken.balanceOf(mining.address);
            await mining.rescueTokens(rawrToken.address, rescueWallet.address, amountToRescue);
    
            // RawrToken tokens were rescued
            expect(await rawrToken.balanceOf(rescueWallet.address)).is.equal(amountToRescue);
            expect(await rawrToken.balanceOf(mining.address)).is.equal(0);
        });
    });
});
