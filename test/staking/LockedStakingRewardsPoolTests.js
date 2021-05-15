const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const LockedStakingRewardsPool = artifacts.require("LockedStakingRewardsPool");
const StakingRewardsPool = artifacts.require("StakingRewardsPool");
const TruffleAssert = require("truffle-assertions")

contract('Locked Fund Base Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,             // address with manager capabilities
        managerAddress2,            // address with manager capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var rawrToken;
    var rewardsPool;
    var lockedPool

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        // console.log("Rawr Token Address: " + rawrToken.address);

        rewardsPool = await StakingRewardsPool.new();
        await rewardsPool.__StakingRewardsPool_init(rawrToken.address);
        
        lockedPool = await LockedStakingRewardsPool.new();
        await lockedPool.__LockedStakingRewardsPool_init(
            rawrToken.address,
            rewardsPool.address,
            web3.utils.toWei('200000000', 'ether'),
            web3.utils.toWei('0.003512337636941769', 'ether'), // 20%
            web3.utils.toWei('0.000012044020616142', 'ether'), // 18%/260 
            260
            );
        
        // lock tokens into contract
        await rawrToken.transfer(lockedPool.address, web3.utils.toWei('200000000', 'ether'), {from: deployerAddress});

        await rawrToken.grantRole(await rawrToken.MINTER_ROLE(), lockedPool.address, {from: deployerAddress});

        // set manager role for manager address
        await rewardsPool.registerManager(lockedPool.address, {from: deployerAddress});
    });

    it('Supports the LockedFund Interface', async () => {
        // _INTERFACE_ID_LOCKED_FUND = 0x00000017
        assert.equal(
            await lockedPool.supportsInterface("0x00000017"),
            true, 
            "the token doesn't support the Locked Fund interface");
    });

    it('Default values test', async () => {
        // console.log((await lockedPool.emissionRate()).toString());
        // console.log((await lockedPool.emissionRateSlowdown()).toString());
        assert.equal(await lockedPool.lockedSupply(), web3.utils.toWei('200000000', 'ether'), "Locked Supply default value incorrect");
        assert.equal(await lockedPool.emissionRate(), web3.utils.toWei('0.003512337636941769', 'ether'), "Emission Rate incorrect");
        assert.equal(await lockedPool.emissionRateSlowdown(), web3.utils.toWei('0.000012044020616142', 'ether'), "Emission Rate slowdown incorrect");
        assert.equal(await lockedPool.intervalsBeforeEmissionRateStabilization(), 260, "Intervals incorrect");
    });

    it('Reload Funds', async () => {
        TruffleAssert.eventEmitted(
            await lockedPool.reloadFunds(web3.utils.toWei('20000', 'ether')),
            'FundsReloaded'
        );

        assert.equal(await lockedPool.lockedSupply(), web3.utils.toWei('200020000', 'ether'), "Locked Supply default value incorrect");
        assert.equal(await rawrToken.totalSupply(), web3.utils.toWei('1000020000', 'ether'), "Incorrect total supply.");
    });

    it('Invalid Reload Funds', async () => {
        await TruffleAssert.fails(
            lockedPool.reloadFunds(web3.utils.toWei('0', 'ether')),
            TruffleAssert.ErrorType.REVERT
        );
        await TruffleAssert.fails(
            lockedPool.reloadFunds(web3.utils.toWei('0', 'ether'), {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Release Funds', async () => {
        // Staked funds are 100000000 rawr tokens
        // await lockedPool.releaseFunds(web3.utils.toWei('100000000', 'ether'));
        TruffleAssert.eventEmitted(
            await lockedPool.releaseFunds(web3.utils.toWei('100000000', 'ether')),
            'FundsReleased'
        );

        assert.equal(
            await rawrToken.balanceOf(rewardsPool.address),
            web3.utils.toWei('351233.7636941769', 'ether'),
            "Incorrect number of tokens released");

        assert.equal(
            await rewardsPool.supply(),
            web3.utils.toWei('351233.7636941769', 'ether'),
            "Incorrect number of released funds for this interval");
        
        assert.equal(
            await rawrToken.balanceOf(lockedPool.address),
            web3.utils.toWei('199648766.2363058231', 'ether'),
            "Incorrect number of tokens locked");
            
        assert.equal(
            await lockedPool.lockedSupply(),
            web3.utils.toWei('199648766.2363058231', 'ether'),
            "Incorrect number of locked tokens in data store");

        // new emission rae (after deduction)
        assert.equal(
            await lockedPool.emissionRate(),
            web3.utils.toWei('0.003500293616325627', 'ether'),
            "Emission Rate incorrect");
        
        assert.equal(
            await lockedPool.intervalsBeforeEmissionRateStabilization(),
            259,
            "interval was not decremented"
        );
    });

    it('Invalid Release Funds', async () => {
        await TruffleAssert.fails(
            lockedPool.releaseFunds(web3.utils.toWei('0', 'ether')),
            TruffleAssert.ErrorType.REVERT
        );
        await TruffleAssert.fails(
            lockedPool.releaseFunds(web3.utils.toWei('0', 'ether'), {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
