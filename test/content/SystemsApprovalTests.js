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
            await testContract.isSystemOperatorApproved(deployerAddress, deployerAddress, {from: deployerAddress}),
            false,
            "deployer shouldn't be approved yet.");
    });

    it('Pass no arguments to registerSystems function', async () => {            
        var approvalPair = [];
        TruffleAssert.eventNotEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            null
        );

        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress, {from: deployerAddress}),
            false,
            "crafting system shouldn't be approved yet.");
    });

    it('Registering Crafting System operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true;
            }
        );

        TruffleAssert.eventEmitted(
            await testContract.userApprove(deployerAddress, true, {from: deployerAddress}),
            'UserApproved',
            (ev) => {
                return ev.user == deployerAddress
                    && ev.approved == true;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
    });

    it('User Not Approved', async () => {            
        var approvalPair = [[craftingSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true;
            }
        );
        
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress),
            false,
            "crafting system should be approved because user has not given permission.");
    });

    it('Registering multiple operators', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == true;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, lootboxSystemAddress),
            true,
            "lootbox system should be approved.");
    });

    it('Registering 1 and unregistering 1 operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, false]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == true
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == false;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });

    it('Registering multiple and unregistering multiple operators', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
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
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'SystemApproved',
            (ev) => {
                return ev[0][0].operator == craftingSystemAddress
                    && ev[0][0].approved == false
                    && ev[0][1].operator == lootboxSystemAddress
                    && ev[0][1].approved == false;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, craftingSystemAddress),
            false,
            "crafting system should not be approved.");
            
        assert.equal(
            await testContract.isSystemOperatorApproved(deployerAddress, lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });
});
