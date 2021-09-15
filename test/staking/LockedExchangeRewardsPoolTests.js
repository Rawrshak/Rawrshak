const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const LockedExchangeRewardsPool = artifacts.require("LockedExchangeRewardsPool");
const ExchangeRewardsPool = artifacts.require("ExchangeRewardsPool");
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

        rewardsPool = await ExchangeRewardsPool.new();
        await rewardsPool.__ExchangeRewardsPool_init(rawrToken.address);
        
        lockedPool = await LockedExchangeRewardsPool.new();
        await lockedPool.__LockedExchangeRewardsPool_init(
            rawrToken.address,
            rewardsPool.address
            );

        // set manager role for manager address
        await rewardsPool.registerManager(lockedPool.address, {from: deployerAddress});
    });

    it('Supports the LockedFund Interface', async () => {
        // INTERFACE_ID_LOCKED_FUND = 0x00000017
        assert.equal(
            await lockedPool.supportsInterface("0x00000017"),
            true, 
            "the token doesn't support the Locked Fund interface");
    });

    it('Default values test', async () => {
        assert.equal(await lockedPool.lockedSupply(), web3.utils.toWei('0', 'ether'), "Locked Supply default value incorrect");
    });

    it('Reload Funds', async () => {
        TruffleAssert.eventEmitted(
            await lockedPool.reloadFunds(web3.utils.toWei('20000', 'ether')),
            'FundsReloaded'
        );
        await rawrToken.transfer(lockedPool.address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        assert.equal(await lockedPool.lockedSupply(), web3.utils.toWei('20000', 'ether'), "Locked Supply default value incorrect");
        assert.equal(await rawrToken.balanceOf(lockedPool.address), web3.utils.toWei('20000', 'ether'), "Incorrect total supply.");
    });

    it('Invalid Reload Funds', async () => {
        await TruffleAssert.fails(
            lockedPool.reloadFunds(web3.utils.toWei('0', 'ether')),
            TruffleAssert.ErrorType.REVERT
        );
        await TruffleAssert.fails(
            lockedPool.reloadFunds(web3.utils.toWei('10', 'ether'), {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Release Funds', async () => {
        // Staked funds are 100000000 rawr tokens
        // await lockedPool.releaseFunds(web3.utils.toWei('100000000', 'ether'));
        // Load rewards pool
        TruffleAssert.eventEmitted(
            await lockedPool.reloadFunds(web3.utils.toWei('20000', 'ether')),
            'FundsReloaded'
        );
        await rawrToken.transfer(lockedPool.address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        TruffleAssert.eventEmitted(
            await lockedPool.releaseFunds(web3.utils.toWei('10000', 'ether')),
            'FundsReleased'
        );

        assert.equal(
            await rawrToken.balanceOf(rewardsPool.address),
            web3.utils.toWei('20000', 'ether'),
            "Incorrect number of tokens released");
            
        assert.equal(
            await rawrToken.balanceOf(lockedPool.address),
            web3.utils.toWei('0', 'ether'),
            "Incorrect number of tokens released");

        assert.equal(
            await rewardsPool.supply(),
            web3.utils.toWei('20000', 'ether'),
            "Incorrect number of released funds for this interval");
            
        assert.equal(
            await lockedPool.lockedSupply(),
            web3.utils.toWei('0', 'ether'),
            "Incorrect number of locked tokens in data store");
    });

    it('Invalid Release Funds', async () => {
        // locked supply = 0, therefore no op
        TruffleAssert.eventNotEmitted(
            await lockedPool.releaseFunds(web3.utils.toWei('0', 'ether')),
            'FundsReleased'
        );

        // Rewards pool holds more tokens than advertised; send everything anyway
        TruffleAssert.eventEmitted(
            await lockedPool.reloadFunds(web3.utils.toWei('10000', 'ether')),
            'FundsReloaded'
        );
        await rawrToken.transfer(lockedPool.address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        TruffleAssert.eventEmitted(
            await lockedPool.releaseFunds(0),
            'FundsReleased'
        );

        assert.equal(
            await rawrToken.balanceOf(lockedPool.address),
            web3.utils.toWei('0', 'ether'),
            "Incorrect number of tokens released");

        assert.equal(
            await rewardsPool.supply(),
            web3.utils.toWei('20000', 'ether'),
            "Incorrect number of released funds for this interval");
    });
});
