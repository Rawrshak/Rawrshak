const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");
const TestFundBase = artifacts.require("TestFundBase");
const TruffleAssert = require("truffle-assertions")

contract('Fund Base Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,             // address with manager capabilities
        managerAddress2,            // address with manager capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;

    var rawrToken;
    var test;

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        // console.log("Rawr Token Address: " + rawrToken.address);

        test = await TestFundBase.new();
        await test.__TestFundBase_init(rawrToken.address);

        // set manager role for manager address
        await test.registerManager(managerAddress, {from: deployerAddress});
    });

    it('Supports the FundPool Interface', async () => {
        // INTERFACE_ID_FUND_POOL = 0x00000015
        assert.equal(
            await test.supportsInterface("0x00000015"),
            true, 
            "the token doesn't support the FundPool interface");
            
        // INTERFACE_ID_CLAIMABLE = 0x00000013
        assert.equal(
            await test.supportsInterface("0x00000013"),
            true, 
            "the token doesn't support the Claimable interface");
    });

    it('Test Access Roles', async () => {
        var default_admin_role = await test.DEFAULT_ADMIN_ROLE();
        var manager_role = await test.MANAGER_ROLE();

        assert.equal(
            await test.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
            
        assert.equal(
            await test.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet had have manager role");
            
        assert.equal(
            await test.hasRole(
                manager_role,
                managerAddress),
            true, 
            "manager wallet didn't have manager role");
            
        // set manager role for manager address
        TruffleAssert.eventEmitted(
            await test.registerManager(managerAddress2, {from: deployerAddress}),
            'ManagerRegistered'
        );
        
        assert.equal(
            await test.hasRole(
                manager_role,
                managerAddress2),
            true, 
            "new manager wallet didn't have manager role");
    });

    it('Default values test', async () => {
        assert.equal(await test.supply(), 0, "Supply default value incorrect");
        assert.equal(await test.remaining(), 0, "Remaining default value incorrect");
    });

    it('Receive Funds', async () => {
        await rawrToken.transfer(test.address, web3.utils.toWei('1000', 'ether'), {from: deployerAddress});

        TruffleAssert.eventEmitted(
            await test.receiveFunds(web3.utils.toWei('1000', 'ether'), {from: managerAddress}),
            'FundsReceived'
        );
        
        assert.equal(await test.supply(), web3.utils.toWei('1000', 'ether'), "Supply value incorrect");
        assert.equal(await test.remaining(), web3.utils.toWei('1000', 'ether'), "Remaining value incorrect");
        
        await rawrToken.transfer(test.address, web3.utils.toWei('1000', 'ether'), {from: deployerAddress});
        await test.receiveFunds(web3.utils.toWei('1000', 'ether'), {from: managerAddress});
        
        assert.equal(await test.supply(), web3.utils.toWei('2000', 'ether'), "Supply value incorrect");
        assert.equal(await test.remaining(), web3.utils.toWei('2000', 'ether'), "Remaining value incorrect");
    });
    
    it('Invalid Receive Funds', async () => {
        await TruffleAssert.fails(
            test.receiveFunds(web3.utils.toWei('1000', 'ether'), {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            test.receiveFunds(web3.utils.toWei('0', 'ether'), {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
    
    it('Claim tokens', async () => {
        await rawrToken.transfer(test.address, web3.utils.toWei('1000', 'ether'), {from: deployerAddress});
        await test.receiveFunds(web3.utils.toWei('1000', 'ether'), {from: managerAddress});

        TruffleAssert.eventEmitted(
            await test.claim(web3.utils.toWei('100', 'ether'), playerAddress, {from: managerAddress}),
            'Claimed'
        );
        
        assert.equal(await test.supply(), web3.utils.toWei('1000', 'ether'), "Supply value incorrect");
        assert.equal(await test.remaining(), web3.utils.toWei('900', 'ether'), "Remaining value incorrect");
        assert.equal(await rawrToken.balanceOf(test.address), web3.utils.toWei('900', 'ether'), "Tokens were not sent properly.");
        assert.equal(await rawrToken.balanceOf(playerAddress), web3.utils.toWei('100', 'ether'), "Tokens were not received properly.");
    });
    
    it('Invalid Claim tokens', async () => {
        await rawrToken.transfer(test.address, web3.utils.toWei('1000', 'ether'), {from: deployerAddress});
        await test.receiveFunds(web3.utils.toWei('1000', 'ether'), {from: managerAddress});

        await TruffleAssert.fails(
            test.claim(web3.utils.toWei('100', 'ether'), playerAddress, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            test.claim(web3.utils.toWei('0', 'ether'), playerAddress, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );        
    });
});
