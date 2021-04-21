const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const OrderbookStorage = artifacts.require("OrderbookStorage");
const OrderbookManager = artifacts.require("OrderbookManager");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Orderbook Storage Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        orderbookManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        contentAddress,              // Player Address
        creatorAddress,             // Player Address
    ] = accounts;

    var orderbookStorage;
    var orderbookManager;
    var manager_role;
    var default_admin_role;
    var orderData= [ 
        [contentAddress, 1],
        creatorAddress,
        "0x00000001",
        web3.utils.toWei('10000', 'ether'),
        5,
        true
    ];

    beforeEach(async () => {
        registry = await AddressRegistry.new();
        await registry.__AddressRegistry_init({from: deployerAddress});

        orderbookStorage = await OrderbookStorage.new();
        await orderbookStorage.__OrderbookStorage_init({from: deployerAddress});

        // register the orderbook storage
        var ids = ["0xe22271ab"];
        var addresses = [orderbookStorage.address];
        await registry.registerAddress(ids, addresses, {from: deployerAddress});

        orderbookManager = await OrderbookManager.new();
        await orderbookManager.__OrderbookManager_init(registry.address, {from: deployerAddress});

        manager_role = await orderbookStorage.MANAGER_ROLE();

        // Register the orderbook manager
        await orderbookStorage.registerManager(orderbookManager.address, {from:deployerAddress})
    });

    it('Check if OrderbookStorage was deployed properly', async () => {
        assert.equal(
            orderbookManager.address != 0x0,
            true,
            "Orderbook Manager was not deployed properly.");
    });

    it('Supports the OrderbookStorage Interface', async () => {
        // _INTERFACE_ID_ORDERBOOK_MANAGER = 0x0000000B
        assert.equal(
            await orderbookManager.supportsInterface("0x0000000B"),
            true, 
            "the orderbook manager doesn't support the OrderbookManager interface");
    });
    

});
