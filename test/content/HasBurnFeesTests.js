const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const TestHasBurnFees = artifacts.require("TestHasBurnFees")
const TruffleAssert = require("truffle-assertions");

contract('HasBurnFees Contract Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        deployerAltAddress,         // Alternate deployer address
        craftingSystemAddress,      // crafting system address
        lootboxSystemAddress,       // lootbox system address
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var testContract;

    beforeEach(async () => {
        testContract = await TestHasBurnFees.new();
        await testContract.__TestHasBurnFees_init();
    });

    it('Check contract burn fees empty', async () => {
        var contractFees = await testContract.getBurnFee(0);

        assert.equal(
            contractFees.length,
            0,
            "There should only be 0 burn fee by default.");
    });

    it('Set Contract Burn fee', async () => {
        var fee = [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]];
        await testContract.setContractBurnFees(fee);
        
        var contractFees = await testContract.getBurnFee(0);
        
        assert.equal(contractFees.length, 1, "There should only be 1 burn fee by default.");
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");
    });

    it('Set Multiple Contract Burn fees', async () => {
        var fee = [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')], [deployerAddress, web3.utils.toWei('0.1', 'ether')]];
        await testContract.setContractBurnFees(fee);

        var contractFees = await testContract.getBurnFee(0);
        
        assert.equal(contractFees.length, 2, "There should only be 2 burn fee by default.");
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");
        assert.equal(contractFees[1].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[1].account, deployerAddress, "Receiver address is incorrect.");
    });

    it('Delete Contract Burn fees', async () => {
        var fee = [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]];
        await testContract.setContractBurnFees(fee);

        var contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees.length, 1, "There should only be 1 burn fee by default.");

        fee = [];
        await testContract.setContractBurnFees(fee);

        contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees.length, 0, "Contract burn fee wasn't deleted");
    });

    it('Update Contract Burn fees', async () => {
        var fee = [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]];
        await testContract.setContractBurnFees(fee);

        fee = [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')], [deployerAddress, web3.utils.toWei('0.1', 'ether')]];
        await testContract.setContractBurnFees(fee);

        var contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees.length, 2, "There should be 2 contract burn fees by default.");
    });

    it('Add Token Burn fees', async () => {
        var assetBurnFees = [
            [0, [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]]],
            [1, [[deployerAltAddress, web3.utils.toWei('0.2', 'ether')]]],
            [2, [[deployerAltAddress, web3.utils.toWei('0.3', 'ether')]]]
        ]
        await testContract.setTokenBurnFeesBatch(assetBurnFees);

        // Check each token 
        var contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");
        
        contractFees = await testContract.getBurnFee(1);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.2', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");
        
        contractFees = await testContract.getBurnFee(2);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.3', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");
    });

    it('Update Token Burn fees', async () => {
        var assetBurnFees = [
            [0, [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]]]
        ];

        await testContract.setTokenBurnFeesBatch(assetBurnFees);

        contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");

        var assetBurnFees = [
            [0, [[deployerAddress, web3.utils.toWei('0.2', 'ether')]]]
        ];
        await testContract.setTokenBurnFeesBatch(assetBurnFees);
        
        contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.2', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAddress, "Receiver address is incorrect.");
    });

    it('Delete Token Burn fees', async () => {
        var assetBurnFees = [
            [0, [[deployerAltAddress, web3.utils.toWei('0.1', 'ether')]]]
        ];

        await testContract.setTokenBurnFeesBatch(assetBurnFees);

        contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees[0].amount, web3.utils.toWei('0.1', 'ether'), "Fee amount is incorrect.");
        assert.equal(contractFees[0].account, deployerAltAddress, "Receiver address is incorrect.");

        assetBurnFees = [
            [0, []]
        ];
        await testContract.setTokenBurnFeesBatch(assetBurnFees);

        contractFees = await testContract.getBurnFee(0);
        assert.equal(contractFees.length, 0, "Contract burn fee wasn't deleted");
    });
});
