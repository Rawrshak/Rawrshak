const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AccessControlManager = artifacts.require("AccessControlManager");
const TruffleAssert = require("truffle-assertions");
const { sign } = require("../mint");

// Todo: Update this test
contract('AccessControlManager Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await AccessControlManager.new();
        await testContract.__AccessControlRegistry_init();
    });

    it('Check that deployer is not approved yet', async () => {
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, deployerAddress, {from: deployerAddress}),
            false,
            "deployer shouldn't be approved yet.");
    });

    it('Pass no arguments to registerSystems function', async () => {            
        var approvalPair = [];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated'
        );

        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress, {from: deployerAddress}),
            false,
            "crafting system shouldn't be approved yet.");
    });

    it('Registering Crafting System operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated',
            (ev) => {
                return ev[1][0].operator == craftingSystemAddress
                    && ev[1][0].approved == true;
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
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
    });

    it('User Not Approved', async () => {            
        var approvalPair = [[craftingSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated',
            (ev) => {
                return ev[1][0].operator == craftingSystemAddress
                    && ev[1][0].approved == true;
            }
        );
        
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress),
            false,
            "crafting system should be approved because user has not given permission.");
    });

    it('Registering multiple operators', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated',
            (ev) => {
                return ev[1][0].operator == craftingSystemAddress
                    && ev[1][0].approved == true
                    && ev[1][1].operator == lootboxSystemAddress
                    && ev[1][1].approved == true;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, lootboxSystemAddress),
            true,
            "lootbox system should be approved.");
    });

    it('Registering 1 and unregistering 1 operator', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, false]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated',
            (ev) => {
                return ev[1][0].operator == craftingSystemAddress
                    && ev[1][0].approved == true
                    && ev[1][1].operator == lootboxSystemAddress
                    && ev[1][1].approved == false;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress),
            true,
            "crafting system should be approved.");
            
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });

    it('Registering multiple and unregistering multiple operators', async () => {  
        await approveSystems(deployerAddress);
        
        approvalPair = [[craftingSystemAddress, false], [lootboxSystemAddress, false]];
        TruffleAssert.eventEmitted(
            await testContract.registerSystems(approvalPair, {from: deployerAddress}),
            'RegisteredSystemsUpdated',
            (ev) => {
                return ev[1][0].operator == craftingSystemAddress
                    && ev[1][0].approved == false
                    && ev[1][1].operator == lootboxSystemAddress
                    && ev[1][1].approved == false;
            }
        );
        
        await testContract.userApprove(deployerAddress, true, {from: deployerAddress});
        
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, craftingSystemAddress),
            false,
            "crafting system should not be approved.");
            
        assert.equal(
            await testContract.isOperatorApproved(deployerAddress, lootboxSystemAddress),
            false,
            "lootbox system should not be approved.");
    });

    it('verify mint from a system operator', async () => {
        await approveSystems(deployerAddress);
        
        const signature = await sign(playerAddress, [1], [1], 0, craftingSystemAddress, testContract.address);
        var mintData = [playerAddress, [1], [1], 0, craftingSystemAddress, signature];

        await testContract.verifyMint(mintData, craftingSystemAddress, {from: deployerAddress});
        
        assert.equal(
            await testContract.userMintNonce(playerAddress),
            0,
            "Caller nonce should not be incremented because it's a system operator.");
    });

    it('verify mint from a signed mint message', async () => {
        await approveSystems(deployerAddress);
        
        const signature = await sign(playerAddress, [1], [1], 1, craftingSystemAddress, testContract.address);
        var mintData = [playerAddress, [1], [1], 1, craftingSystemAddress, signature];

        await testContract.verifyMint(mintData, playerAddress, {from: deployerAddress});
        
        assert.equal(
            await testContract.userMintNonce(playerAddress),
            1,
            "User nonce was not incremented.");
    });

    it('verify mint failure from signed mint message from ', async () => {            
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, false]];
        await testContract.registerSystems(approvalPair, {from: deployerAddress});
        
        const signature = await sign(playerAddress, [1], [1], 1, lootboxSystemAddress, testContract.address);
        var mintData = [playerAddress, [1], [1], 1, lootboxSystemAddress, signature];

        TruffleAssert.fails(
            testContract.verifyMint(mintData, playerAddress, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        )
        
        assert.equal(
            await testContract.userMintNonce(playerAddress),
            0,
            "User nonce was incremented incorrectly.");
    });

    async function approveSystems(fromAddress) {
        var approvalPair = [[craftingSystemAddress, true], [lootboxSystemAddress, true]];
        await testContract.registerSystems(approvalPair, {from: fromAddress});
    }
});
