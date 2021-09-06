const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestHasContractUri = artifacts.require("TestHasContractUri")
const TruffleAssert = require("truffle-assertions");

contract('HasContractUri Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestHasContractUri.new();
        await testContract.__TestHasContractUri_init("");
    });

    it('Check default Contract Uri', async () => {
        assert.equal(
            await testContract.contractUri(),
            "",
            "Contract Uri should be empty.");
    });
    
    it('Non-empty string default uri', async () => {
        testContract = await TestHasContractUri.new();
        await testContract.__TestHasContractUri_init("ipfs:/TestContractInfo.json");
        assert.equal(
            await testContract.contractUri(),
            "ipfs:/TestContractInfo.json",
            "Contract Uri should not be empty.");
    });
    
    it('Setting the default contract uri', async () => {
        await testContract.setContractUri("ipfs:/TestContractInfo.json");
        assert.equal(
            await testContract.contractUri(),
            "ipfs:/TestContractInfo.json",
            "Contract Uri should not be empty.");
    });
    
    it('Setting the default contract uri to null string', async () => {
        await testContract.setContractUri("");
        assert.equal(
            await testContract.contractUri(),
            "",
            "Contract Uri should be empty.");
    });
});
