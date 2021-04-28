const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestSystemsApproval = artifacts.require("TestSystemsApproval")
const TruffleAssert = require("truffle-assertions");

// Todo: fix this
contract('SystemsApproval Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestSystemsApproval.new();
        await testContract.__TestSystemsApproval_init();
    });

    it('Check that deployer is not approved yet', async () => {
        assert.equal(
            await testContract.isSystemOperator(deployerAddress),
            false,
            "deployer shouldn't be approved yet.");
    });

    it('Pass no arguments to setSystemApproval function', async () => {            
        var approvalPair = [];
        TruffleAssert.eventNotEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            null
        );

        assert.equal(
            await testContract.isSystemOperator(craftingSystemAddress),
            false,
            "crafting system shouldn't be approved yet.");
    });

    it('Approve Crafting System operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperator(craftingSystemAddress),
            true,
            "crafting system should be approved.");
    });

    it('Approving multiple operators', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == true;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperator(craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isSystemOperator(lootboxSystemAddress),
            true,
            "lootbox system should be approved.");
    });

    it('Approving 1 and disapproving 1 operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, false]];
        TruffleAssert.eventEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == false;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperator(craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isSystemOperator(lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });

    it('Approving multiple and disapproving multiple operators', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == true;
            }
        );
        
        approvalPair = [[craftingSystemAddress, false], [lootboxSystemAddress, false]];
        TruffleAssert.eventEmitted(
            await testContract.setSystemApproval(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == false
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == false;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperator(craftingSystemAddress),
            false,
            "crafting system should not be approved.");
            
        assert.equal(
            await testContract.isSystemOperator(lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });
});
