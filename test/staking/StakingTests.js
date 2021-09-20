const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const AddressResolver = artifacts.require("AddressResolver");
const Staking = artifacts.require("Staking");
const TruffleAssert = require("truffle-assertions")

contract('Staking Rewards Pool Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        staker1,             // address with manager capabilities
        staker2,            // address with manager capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var rawrToken;
    var feesEscrow;
    var resolver;
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

        staking = await Staking.new();
        await staking.__Staking_init(rawrToken.address, resolver.address, {from: deployerAddress});

    });

    async function setup() {
        // Register Staking as a manager for the rewards pools
        await feesEscrow.registerManager(staking.address, {from: deployerAddress});

        // register the escrows
        await resolver.registerAddress(["0x1b48faca", "0x4911f18f"], [staking.address, feesEscrow.address], {from: deployerAddress});
        
        // Give token to player
        await rawrToken.transfer(playerAddress, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});
    }

    it('Supports the Staking Interface', async () => {
        // INTERFACE_ID_STAKING = 0x00000016
        assert.equal(
            await staking.supportsInterface("0x00000016"),
            true, 
            "the token doesn't support the Staking interface");
    });

    it('Check Default variables', async () => {
        assert.equal(await staking.totalStakedTokens(), 0, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(playerAddress), 0, "Incorrect staked tokens for player 1");
        assert.equal(await staking.userStakedAmount(player2Address), 0, "Incorrect staked tokens for player 2");
        assert.equal(await staking.token(), rawrToken.address, "Incorrect staked token address");
    });

    it('Single Staker', async () => {
        await setup();

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await staking.stake(10000, {from: playerAddress});

        assert.equal(await staking.totalStakedTokens(), 10000, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(playerAddress), 10000, "Incorrect staked tokens for player 1");

        var claimable = await staking.getUserClaimableExchangeRewards(playerAddress, {from: playerAddress});
        assert.equal(claimable.length, 0, "No token rewards yet.");
    });

    it('Multiple Stakers', async () => {
        await setup();
        // Give token to player
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await rawrToken.approve(staking.address, 20000, {from:player2Address});
        await staking.stake(10000, {from: playerAddress});
        await staking.stake(20000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 30000, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(playerAddress), 10000, "Incorrect staked tokens for player 1");
        assert.equal(await staking.userStakedAmount(player2Address), 20000, "Incorrect staked tokens for player 2");

        var claimable = await staking.getUserClaimableExchangeRewards(playerAddress, {from: playerAddress});
        assert.equal(claimable.length, 0, "No token rewards yet.");
    });

    it('Multiple Stakers, Single Withdraw', async () => {
        await setup();
        // Give token to player
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await rawrToken.approve(staking.address, 20000, {from:player2Address});
        await staking.stake(10000, {from: playerAddress});
        await staking.stake(20000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 30000, "Incorrect total staked tokens");
        await staking.withdraw(10000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 20000, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(playerAddress), 10000, "Incorrect staked tokens for player 1");
        assert.equal(await staking.userStakedAmount(player2Address), 10000, "Incorrect staked tokens for player 2");
    });

    it('Multiple Stakers, Multiple Withdraw', async () => {
        await setup();
        // Give token to player
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await rawrToken.approve(staking.address, 20000, {from:player2Address});
        await staking.stake(10000, {from: playerAddress});
        await staking.stake(20000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 30000, "Incorrect total staked tokens");
        await staking.withdraw(10000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 20000, "Incorrect total staked tokens");
        
        await staking.withdraw(5000, {from: playerAddress});
        await staking.withdraw(5000, {from: player2Address});
        assert.equal(await staking.userStakedAmount(playerAddress), 5000, "Incorrect staked tokens for player 1");
        assert.equal(await staking.userStakedAmount(player2Address), 5000, "Incorrect staked tokens for player 2");
    });

    it('Multiple Staker, Single Exit', async () => {
        await setup();
        // Give token to player
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await rawrToken.approve(staking.address, 20000, {from:player2Address});
        await staking.stake(10000, {from: playerAddress});
        await staking.stake(20000, {from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 30000, "Incorrect total staked tokens");
        await staking.exit({from: player2Address});

        assert.equal(await staking.totalStakedTokens(), 10000, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(player2Address), 0, "Incorrect staked tokens for player 2");
    });

    it('Single Staker with Claim', async () => {
        await setup();

        // Give token to player
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 10000, {from:playerAddress});
        await staking.stake(10000, {from: playerAddress});

        assert.equal(await staking.totalStakedTokens(), 10000, "Incorrect total staked tokens");
        assert.equal(await staking.userStakedAmount(playerAddress), 10000, "Incorrect staked tokens for player 1");

        // Update internal deposits
        await rawrToken.transfer(feesEscrow.address, web3.utils.toWei('100', 'ether'), {from: player2Address});
        await feesEscrow.depositFees(rawrToken.address, web3.utils.toWei('100', 'ether'), {from: deployerAddress});

        var claimable = await staking.getUserClaimableExchangeRewards(playerAddress, {from: playerAddress});
        assert.equal(claimable.length, 1, "There should be 1 reward.");
        assert.equal(claimable[0].amount, web3.utils.toWei('100', 'ether'), "Reward should be 100 rawr tokens");

        await staking.claimRewards({from: playerAddress});
        
        assert.equal(
            await rawrToken.balanceOf(feesEscrow.address),
            0,
            "Staker should have claimed the tokens already."
        );
    });

    it('Multiple Staker with Single Claim', async () => {
        await setup();

        // Give token to player
        await rawrToken.transfer(staker1, 25, {from: deployerAddress});
        await rawrToken.transfer(staker2, 75, {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 25, {from:staker1});
        await rawrToken.approve(staking.address, 75, {from:staker2});
        await staking.stake(25, {from: staker1});
        await staking.stake(75, {from: staker2});

        assert.equal(await staking.totalStakedTokens(), 100, "Incorrect total staked tokens");

        // Update internal deposits
        await rawrToken.transfer(feesEscrow.address, 1000, {from: player2Address});
        await feesEscrow.depositFees(rawrToken.address, 1000, {from: deployerAddress});

        await staking.claimRewards({from: staker1});

        assert.equal(
            await rawrToken.balanceOf(staker1),
            250,
            "Staker should have claimed the tokens already."
        );
    });

    it('Multiple Staker with Multiple rewards and single claim', async () => {
        await setup();

        // Give token to player
        await rawrToken.transfer(staker1, 25, {from: deployerAddress});
        await rawrToken.transfer(staker2, 75, {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 25, {from:staker1});
        await rawrToken.approve(staking.address, 75, {from:staker2});
        await staking.stake(25, {from: staker1});
        await staking.stake(75, {from: staker2});

        assert.equal(await staking.totalStakedTokens(), 100, "Incorrect total staked tokens");

        // Update internal deposits
        await rawrToken.transfer(feesEscrow.address, 1000, {from: player2Address});
        await feesEscrow.depositFees(rawrToken.address, 1000, {from: deployerAddress});

        await rawrToken.transfer(feesEscrow.address, 4000, {from: playerAddress});
        await feesEscrow.depositFees(rawrToken.address, 4000, {from: deployerAddress});

        await staking.claimRewards({from: staker1});

        assert.equal(
            await rawrToken.balanceOf(staker1),
            1250,
            "Staker should have claimed the tokens already."
        );
    });

    it('Multiple Staker with Multiple rewards and multiple claims', async () => {
        await setup();

        // Give token to player
        await rawrToken.transfer(staker1, 25, {from: deployerAddress});
        await rawrToken.transfer(staker2, 75, {from: deployerAddress});
        await rawrToken.transfer(player2Address, web3.utils.toWei('20000', 'ether'), {from: deployerAddress});

        // Player 1 is Staking 10000 tokens (in wei)
        await rawrToken.approve(staking.address, 25, {from:staker1});
        await rawrToken.approve(staking.address, 75, {from:staker2});
        await staking.stake(25, {from: staker1});
        await staking.stake(75, {from: staker2});

        assert.equal(await staking.totalStakedTokens(), 100, "Incorrect total staked tokens");

        // Update internal deposits
        await rawrToken.transfer(feesEscrow.address, 1000, {from: player2Address});
        await feesEscrow.depositFees(rawrToken.address, 1000, {from: deployerAddress});

        await staking.claimRewards({from: staker1});
        assert.equal(
            await rawrToken.balanceOf(staker1),
            250,
            "Staker should have claimed the tokens already."
        );
        
        await rawrToken.transfer(feesEscrow.address, 4000, {from: playerAddress});
        await feesEscrow.depositFees(rawrToken.address, 4000, {from: deployerAddress});

        await staking.claimRewards({from: staker1});
        assert.equal(
            await rawrToken.balanceOf(staker1),
            1250,
            "Staker should have claimed the tokens already."
        );

        var claimable = await staking.getUserClaimableExchangeRewards(staker2, {from: staker2});
        assert.equal(claimable[0].amount, 3750, "No token rewards yet.");
    });

});
