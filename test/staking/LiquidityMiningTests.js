const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const ExchangeFeesEscrow = artifacts.require("ExchangeFeesEscrow");
const LiquidityMining = artifacts.require("LiquidityMining");
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
    var mockUSDC;
    var mockUSDT;
    var mockDAI;

    var feesEscrow;
    var resolver;
    var staking;

    before(async () => {
    });

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__ERC20PresetMinterPauser_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});

        mockUSDC = await MockToken.new();
        await mockUSDC.initialize("USDC", "USDC");
        mockUSDT = await MockToken.new();
        await mockUSDT.initialize("USDT", "USDT");
        mockDAI = await MockToken.new();
        await mockDAI.initialize("DAI", "DAI");

        staking = await LiquidityMining.new();
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

    // it('Contract Exists', async () => {
    //     assert.equal(
    //         feesEscrow.address != 0x0,
    //         true,
    //         "Exchange Fee Pool was not deployed properly.");
    // });
});
