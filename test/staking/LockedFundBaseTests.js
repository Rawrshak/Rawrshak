const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const TestLockedFundBase = artifacts.require("TestLockedFundBase");
const TestFundBase = artifacts.require("TestFundBase");
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
    var fundBase;
    var lockedFundBase

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        // console.log("Rawr Token Address: " + rawrToken.address);

        fundBase = await TestFundBase.new();
        await fundBase.__TestFundBase_init(rawrToken.address);
        
        lockedFundBase = await TestLockedFundBase.new();
        await lockedFundBase.__TestLockedFundBase_init(rawrToken.address, fundBase.address);

        // set manager role for manager address
        await fundBase.registerManager(lockedFundBase.address, {from: deployerAddress});
    });

    it('Supports the LockedFund Interface', async () => {
        // INTERFACE_ID_LOCKED_FUND = 0x00000017
        assert.equal(
            await lockedFundBase.supportsInterface("0x00000017"),
            true, 
            "the token doesn't support the Locked Fund interface");
    });

    it('Default values test', async () => {
        assert.equal(await lockedFundBase.lockedSupply(), 0, "Locked Supply default value incorrect");
    });
});
