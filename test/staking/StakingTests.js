const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const StakingRewardsPool = artifacts.require("StakingRewardsPool");
const LockedStakingRewardsPool = artifacts.require("LockedStakingRewardsPool");
const ExchangeRewardsPool = artifacts.require("ExchangeRewardsPool");
const LockedExchangeRewardsPool = artifacts.require("LockedExchangeRewardsPool");
const Staking = artifacts.require("Staking");
const TruffleAssert = require("truffle-assertions")

contract('Staking Rewards Pool Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,             // address with manager capabilities
        managerAddress2,            // address with manager capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var rawrToken;
    var stakingRewardsPool;
    var lockedStakingRewardsPool;
    var exchangeRewardsPool;
    var lockedExchangeRewardsPool;
    var staking;

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
    });

    it('Supports the FundPool Interface', async () => {
        // _INTERFACE_ID_STAKING = 0x00000016
        assert.equal(
            await staking.supportsInterface("0x00000016"),
            true, 
            "the token doesn't support the Staking interface");
    });

    it('Check Default variables', async () => {
        assert.equal(await staking.totalStakedTokens(), 0, "Incorrect total staked tokens");
        assert.equal(await staking.stakedAmounts(playerAddress), 0, "Incorrect staked tokens for player 1");
        assert.equal(await staking.stakedAmounts(player2Address), 0, "Incorrect staked tokens for player 2");
        assert.equal(await staking.totalClaimableTokensInInterval(), 0, "Incorrect staked tokens for player 2");
        assert.equal(await staking.unclaimedTokensInInterval(), 0, "Incorrect staked tokens for player 2");
    });

    it('Claimable and unclaimed tokens in interval', async () => {
        // release fund for staking contract interval
        await lockedStakingRewardsPool.releaseFunds(web3.utils.toWei('1000000', 'ether'));

        // reload locked exchange fund and release locked exchange fund
        await rawrToken.transfer(lockedExchangeRewardsPool.address, web3.utils.toWei('500000', 'ether'), {from: deployerAddress});
        await lockedExchangeRewardsPool.reloadFunds(web3.utils.toWei('500000', 'ether'));
        await lockedExchangeRewardsPool.releaseFunds(web3.utils.toWei('0', 'ether'));
        
        assert.equal((await staking.totalClaimableTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total claimable tokens in interval");
        assert.equal((await staking.unclaimedTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total unclaimed tokens in interval");
    });

    it('Deposit Tokens', async () => {
        // Player 1 deposit
        await rawrToken.approve(staking.address, web3.utils.toWei('20000', 'ether'), {from:playerAddress});
        TruffleAssert.eventEmitted(
            await staking.deposit(web3.utils.toWei('20000', 'ether'), {from: playerAddress}),
            'Deposit'
        );
        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('20000', 'ether'), "Incorrect total staked tokens");
        assert.equal(await staking.stakedAmounts(playerAddress), web3.utils.toWei('20000', 'ether'), "Incorrect staked tokens for player 1");
        assert.equal(
            await rawrToken.balanceOf(staking.address),
            web3.utils.toWei('20000', 'ether'),
            "Incorrect number of tokens staked");
        assert.equal(
            await rawrToken.balanceOf(playerAddress),
            web3.utils.toWei('49980000', 'ether'),
            "Player 1 didn't send their tokens properly to stake contract");

        // Player 2 deposit
        await rawrToken.approve(staking.address, web3.utils.toWei('30000', 'ether'), {from:player2Address});
        TruffleAssert.eventEmitted(
            await staking.deposit(web3.utils.toWei('30000', 'ether'), {from: player2Address}),
            'Deposit'
        );
        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('50000', 'ether'), "Incorrect total staked tokens");
        assert.equal(await staking.stakedAmounts(player2Address), web3.utils.toWei('30000', 'ether'), "Incorrect staked tokens for player 2");
        assert.equal(
            await rawrToken.balanceOf(staking.address),
            web3.utils.toWei('50000', 'ether'),
            "Incorrect number of tokens staked");
        assert.equal(
            await rawrToken.balanceOf(player2Address),
            web3.utils.toWei('49970000', 'ether'),
            "Player 2 didn't send their tokens properly to stake contract");
    });

    it('Withdraw Tokens', async () => {
        // deposits
        await rawrToken.approve(staking.address, web3.utils.toWei('20000', 'ether'), {from:playerAddress});
        await rawrToken.approve(staking.address, web3.utils.toWei('30000', 'ether'), {from:player2Address});
        await staking.deposit(web3.utils.toWei('20000', 'ether'), {from: playerAddress});
        await staking.deposit(web3.utils.toWei('30000', 'ether'), {from: player2Address});
        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('50000', 'ether'), "Incorrect total staked tokens");

        await staking.withdraw(web3.utils.toWei('10000', 'ether'), {from: playerAddress});
        assert.equal(await staking.stakedAmounts(playerAddress), web3.utils.toWei('10000', 'ether'), "Incorrect staked tokens for player 1");
        await staking.withdraw(web3.utils.toWei('10000', 'ether'), {from: playerAddress});
        assert.equal(await staking.stakedAmounts(playerAddress), web3.utils.toWei('0', 'ether'), "Incorrect staked tokens for player 1");

        await staking.withdraw(web3.utils.toWei('10000', 'ether'), {from: player2Address});
        assert.equal(await staking.stakedAmounts(player2Address), web3.utils.toWei('20000', 'ether'), "Incorrect staked tokens for player 2");

        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('20000', 'ether'), "Incorrect total staked tokens");
    });

    it('Stake percentage', async () => {
        // deposits
        await rawrToken.approve(staking.address, web3.utils.toWei('20000', 'ether'), {from:playerAddress});
        await rawrToken.approve(staking.address, web3.utils.toWei('30000', 'ether'), {from:player2Address});
        await staking.deposit(web3.utils.toWei('20000', 'ether'), {from: playerAddress});
        await staking.deposit(web3.utils.toWei('30000', 'ether'), {from: player2Address});
        assert.equal(await staking.totalStakedTokens(), web3.utils.toWei('50000', 'ether'), "Incorrect total staked tokens");
        
        assert.equal(await staking.getStakePercentage({from: playerAddress}), web3.utils.toWei('0.4', 'ether'), "Incorrect stake percentage for player 1");     
    });

    it('Claim', async () => {
        // deposits
        await rawrToken.approve(staking.address, web3.utils.toWei('500000', 'ether'), {from:playerAddress});
        await rawrToken.approve(staking.address, web3.utils.toWei('500000', 'ether'), {from:player2Address});
        await staking.deposit(web3.utils.toWei('500000', 'ether'), {from: playerAddress});
        await staking.deposit(web3.utils.toWei('500000', 'ether'), {from: player2Address});

        // release fund for staking contract interval
        await lockedStakingRewardsPool.releaseFunds(web3.utils.toWei('1000000', 'ether'));

        // reload locked exchange fund and release locked exchange fund
        await rawrToken.transfer(lockedExchangeRewardsPool.address, web3.utils.toWei('500000', 'ether'), {from: deployerAddress});
        await lockedExchangeRewardsPool.reloadFunds(web3.utils.toWei('500000', 'ether'));
        await lockedExchangeRewardsPool.releaseFunds(web3.utils.toWei('0', 'ether'));

        assert.equal((await staking.totalClaimableTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total claimable tokens in interval");
        assert.equal((await staking.unclaimedTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total unclaimed tokens in interval");
        assert.equal(await staking.getStakePercentage({from: playerAddress}), web3.utils.toWei('0.5', 'ether'), "Incorrect stake percentage for player 1"); 

        await staking.claim({from: playerAddress});
        assert.equal((await staking.totalClaimableTokensInInterval()).toString(), web3.utils.toWei('503512.337636941769', 'ether'), "Incorrect total claimable tokens in interval");
        assert.equal((await staking.unclaimedTokensInInterval()).toString(), web3.utils.toWei('251756.1688184708845', 'ether'), "Incorrect total unclaimabled tokens in interval");
        assert.equal((await rawrToken.balanceOf(playerAddress)).toString(), web3.utils.toWei('49751756.1688184708845', 'ether'), "Incorrect Player 1 tokens after claim");
    });


});
