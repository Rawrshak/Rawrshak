const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const OrderbookStorage = artifacts.require("OrderbookStorage");
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
        orderbookStorage = await OrderbookStorage.new();
        await orderbookStorage.__OrderbookStorage_init({from: deployerAddress});

        manager_role = await orderbookStorage.MANAGER_ROLE();
        default_admin_role = await orderbookStorage.DEFAULT_ADMIN_ROLE();

        // Register the orderbook manager
        await orderbookStorage.registerManager(orderbookManagerAddress, {from:deployerAddress})
    });

    it('Check if OrderbookStorage was deployed properly', async () => {
        assert.equal(
            orderbookStorage.address != 0x0,
            true,
            "Orderbook Storage was not deployed properly.");
    });

    it('Supports the OrderbookStorage Interface', async () => {
        // _INTERFACE_ID_ORDERBOOK_STORAGE = 0x00000008
        assert.equal(
            await orderbookStorage.supportsInterface("0x0000000A"),
            true, 
            "the orderbook storage doesn't support the OrderbookStorage interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        assert.equal(
            await orderbookStorage.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Deployer wallet must not have manager role', async () => {
        assert.equal(
            await orderbookStorage.hasRole(
                manager_role,
                deployerAddress),
            false, 
            "deployer wallet should not have the manager role");
    });
    
    it('Registering Manager address', async () => {        
        TruffleAssert.eventEmitted(
            await orderbookStorage.registerManager(royaltiesManagerAddress, {from:deployerAddress}),
            'ManagerRegistered'
        );

        assert.equal(
            await orderbookStorage.hasRole(
                manager_role,
                orderbookManagerAddress),
            true, 
            "orderbook manager should have the manager role");

        assert.equal(
            await orderbookStorage.hasRole(
                manager_role,
                royaltiesManagerAddress),
            true, 
            "royalties manager should have the manager role");
    });
    
    it('Place Order', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});

        // check if the order was saved
        storedOrderData = await orderbookStorage.getOrder(1, {from: orderbookManagerAddress});

        assert.equal(
            storedOrderData[0][0] == orderData[0][0] && 
            storedOrderData[0][1] == orderData[0][1],
            true, 
            "order.asset was not properly stored.");
            
        assert.equal(
            storedOrderData[1],
            orderData[1], 
            "order.owner was not properly stored.");
        assert.equal(
            storedOrderData[2],
            orderData[2], 
            "order.token was not properly stored.");
            
        assert.equal(
            storedOrderData[3],
            orderData[3], 
            "order.price was not properly stored.");
            
        assert.equal(
            storedOrderData[4],
            orderData[4], 
            "order.amount was not properly stored.");
            
        assert.equal(
            storedOrderData[5],
            orderData[5], 
            "order.isBuyOrder was not properly stored.");
    });

    it('Test Verify Orders', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});

        assert.equal(
            await orderbookStorage.verifyOrders(
                [1],
                orderData[0],
                orderData[2],
                orderData[5]
            ),
            true,
            "Order was not verified correctly."
        )
    });

    it('Verify Orders Failures', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});

        assert.equal(
            await orderbookStorage.verifyOrders(
                [2],
                orderData[0],
                orderData[2],
                orderData[5]
            ),
            false,
            "No order - should have failed."
        );
        assert.equal(
            await orderbookStorage.verifyOrders(
                [1],
                [royaltiesManagerAddress, 1],
                orderData[2],
                orderData[5]
            ),
            false,
            "Incorrect Asset Data - should have failed."
        );
        assert.equal(
            await orderbookStorage.verifyOrders(
                [1],
                orderData[0],
                "0x00000002",
                orderData[5]
            ),
            false,
            "Incorrect token id - should have failed."
        );
        assert.equal(
            await orderbookStorage.verifyOrders(
                [1],
                orderData[0],
                orderData[2],
                false
            ),
            false,
            "Incorrect buy order - should have failed."
        );
    });
    
    it('Order Exists', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});

        assert.equal(
            await orderbookStorage.orderExists(1),
            true,
            "Order doesn't exist."
        );
    });
    
    it('Delete Order', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});
        await orderbookStorage.deleteOrder(1, {from: orderbookManagerAddress});

        assert.equal(
            await orderbookStorage.orderExists(1),
            false,
            "Order still exists."
        );
    });
    
    it('Verify Owner', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});
        
        assert.equal(
            await orderbookStorage.verifyOwner(1, creatorAddress, {from: orderbookManagerAddress}),
            true,
            "Order owner is not verified."
        );
    });
    
    it('Fill Order', async () => {
        await orderbookStorage.placeOrder(1, orderData, {from: orderbookManagerAddress});

        await orderbookStorage.fillOrder(1, 1, {from: orderbookManagerAddress});

        // check if the order was partially filled
        storedOrderData = await orderbookStorage.getOrder(1, {from: orderbookManagerAddress});
        
        assert.equal(
            storedOrderData[4],
            4, 
            "Order 1 was not partially filled.");

        await orderbookStorage.fillOrder(1, 4, {from: orderbookManagerAddress});
        
        // check if the order was completely filled
        storedOrderData = await orderbookStorage.getOrder(1, {from: orderbookManagerAddress});
        
        assert.equal(
            storedOrderData[4],
            0,
            "Order 1 was not completely filled.");
            
    });

});
