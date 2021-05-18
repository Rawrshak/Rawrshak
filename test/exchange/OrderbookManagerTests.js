const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const OrderbookStorage = artifacts.require("OrderbookStorage");
const TestOrderbookManager = artifacts.require("TestOrderbookManager");
const AddressRegistry = artifacts.require("AddressRegistry");
const TruffleAssert = require("truffle-assertions");

contract('Orderbook Manager Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        orderbookManagerAddress,    // execution manager address
        royaltiesManagerAddress,    // royalties manager address
        contentAddress,             // content nft Address
        creatorAddress,             // creator Address
        maliciousAddress,           // malicious address
    ] = accounts;

    var orderbookStorage;
    var orderbookManager;
    var manager_role;
    var default_admin_role;
    
    // this id is equal to OrderbookManater::_generateOrderId(address _user, address _tokenAddr, uint256 _tokenId) for orderData1
    var id;
    var orderData1= [ 
        [contentAddress, 1],
        creatorAddress,
        "0x00000001",
        web3.utils.toWei('10000', 'ether'),
        5,
        true
    ];
    var orderData2= [ 
        [contentAddress, 2],
        creatorAddress,
        "0x00000002",
        web3.utils.toWei('5000', 'ether'),
        5,
        false
    ];
    var orderData3= [ 
        [contentAddress, 1],
        creatorAddress,
        "0x00000001",
        web3.utils.toWei('2000', 'ether'),
        3,
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

        orderbookManager = await TestOrderbookManager.new();
        await orderbookManager.__TestOrderbookManager_init(registry.address, {from: deployerAddress});

        manager_role = await orderbookStorage.MANAGER_ROLE();

        // Register the orderbook manager
        await orderbookStorage.registerManager(orderbookManager.address, {from:deployerAddress})
        
        await orderbookManager.placeOrder(orderData1, {from: deployerAddress});

        id = await orderbookManager.getId(orderData1);
    });

    it('Check if OrderbookManager was deployed properly', async () => {
        assert.equal(
            orderbookManager.address != 0x0,
            true,
            "Orderbook Manager was not deployed properly.");
    });

    it('Supports the OrderbookManager Interface', async () => {
        // _INTERFACE_ID_ORDERBOOK_MANAGER = 0x0000000B
        assert.equal(
            await orderbookManager.supportsInterface("0x0000000B"),
            true, 
            "the orderbook manager doesn't support the OrderbookManager interface");
    });

    it('Place an Order', async () => {
        // var id = await orderbookManager.generateOrderId(orderData1);
        // this id is equal to OrderbookManater::_generateOrderId(address _user, address _tokenAddr, uint256 _tokenId) for orderData1
        await orderbookManager.placeOrder(orderData2, {from: deployerAddress});
        var id2 = await orderbookManager.getId(orderData2);
        
        // check if the order was saved
        storedOrderData = await orderbookManager.getOrder(id2, {from: deployerAddress});

        assert.equal(
            storedOrderData[0][0] == orderData2[0][0] && 
            storedOrderData[0][1] == orderData2[0][1],
            true, 
            "order.asset was not properly stored.");
        assert.equal(
            storedOrderData[1],
            orderData2[1], 
            "order.owner was not properly stored.");
        assert.equal(
            storedOrderData[2],
            orderData2[2], 
            "order.token was not properly stored.");
            
        assert.equal(
            storedOrderData[3],
            orderData2[3], 
            "order.price was not properly stored.");
            
        assert.equal(
            storedOrderData[4],
            orderData2[4], 
            "order.amount was not properly stored.");
            
        assert.equal(
            storedOrderData[5],
            orderData2[5], 
            "order.isBuyOrder was not properly stored.");
    });

    it('Place multiple Orders', async () => {
        await orderbookManager.placeOrder(orderData2, {from: deployerAddress});
        var id2 = await orderbookManager.getId(orderData2);
        await orderbookManager.placeOrder(orderData3, {from: deployerAddress});
        var id3 = await orderbookManager.getId(orderData3);
        
        // check if the order was saved
        storedOrderData = await orderbookManager.getOrder(id3, {from: deployerAddress});

        assert.equal(
            storedOrderData[0][0] == orderData3[0][0] && 
            storedOrderData[0][1] == orderData3[0][1],
            true, 
            "order.asset was not properly stored.");
        assert.equal(
            storedOrderData[1],
            orderData3[1], 
            "order.owner was not properly stored.");
        assert.equal(
            storedOrderData[2],
            orderData3[2], 
            "order.token was not properly stored.");
            
        assert.equal(
            storedOrderData[3],
            orderData3[3], 
            "order.price was not properly stored.");
            
        assert.equal(
            storedOrderData[4],
            orderData3[4], 
            "order.amount was not properly stored.");
            
        assert.equal(
            storedOrderData[5],
            orderData3[5], 
            "order.isBuyOrder was not properly stored.");
    });

    it('Verifys saves Order data', async () => {
        await orderbookManager.placeOrder(orderData2, {from: deployerAddress});
        var id2 = await orderbookManager.getId(orderData2);
        await orderbookManager.placeOrder(orderData3, {from: deployerAddress});
        var id3 = await orderbookManager.getId(orderData3);

        assert.equal(
            await orderbookManager.verifyOrders(
                [id, id3],
                orderData1[0],
                orderData1[2],
                orderData1[5],
                {from: deployerAddress}
            ),
            true,
            "Orders were not verified correctly."
        )

        assert.equal(
            await orderbookManager.verifyOrders(
                [id, id2],
                orderData1[0],
                orderData1[2],
                orderData1[5],
                {from: deployerAddress}
            ),
            false,
            "Orders were verified incorrectly."
        )
    });

    it('Get Payment totals', async () => {
        await orderbookManager.placeOrder(orderData2, {from: deployerAddress});
        var id2 = await orderbookManager.getId(orderData2);
        await orderbookManager.placeOrder(orderData3, {from: deployerAddress});
        var id3 = await orderbookManager.getId(orderData3);

        var paymentTotals = await orderbookManager.getPaymentTotals([id, id3], [1, 1]);

        assert.equal(
            paymentTotals[0],
            web3.utils.toWei('12000', 'ether'),
            "Incorrect amount due."
        );
        
        assert.equal(
            paymentTotals[1][0],
            web3.utils.toWei('10000', 'ether'),
            "Incorrect amount due."
        );
        
        assert.equal(
            paymentTotals[1][1],
            web3.utils.toWei('2000', 'ether'),
            "Incorrect amount due."
        );
        
        paymentTotals = await orderbookManager.getPaymentTotals([id, id3], [3, 3]);
        
        assert.equal(
            paymentTotals[0],
            web3.utils.toWei('36000', 'ether'),
            "Incorrect amount due."
        );
        
        assert.equal(
            paymentTotals[1][0],
            web3.utils.toWei('30000', 'ether'),
            "Incorrect amount due."
        );
        
        assert.equal(
            paymentTotals[1][1],
            web3.utils.toWei('6000', 'ether'),
            "Incorrect amount due."
        );
    });

    it('Invalid Input Length', async () => {
        var id3 = await orderbookManager.getId(orderData3);
        
        await TruffleAssert.fails(
            orderbookManager.getPaymentTotals([id, id3], [1]),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            orderbookManager.getPaymentTotals([id3], [1, 1]),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            orderbookManager.getPaymentTotals([id, id3], [1, 10]),
            TruffleAssert.ErrorType.REVERT
        );

        // Note that getPaymentOrder* does the checking to verify if there is enough 
        // assets escrowed. So fillOrders doesn't need to check for invalid amounts
        await TruffleAssert.fails(
            orderbookManager.fillOrders([id, id3], [1], {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Fill Orders', async () => {
        await orderbookManager.placeOrder(orderData2, {from: deployerAddress});
        var id2 = await orderbookManager.getId(orderData2);
        await orderbookManager.placeOrder(orderData3, {from: deployerAddress});
        var id3 = await orderbookManager.getId(orderData3);

        await orderbookManager.fillOrders([id, id3], [1, 1], {from: deployerAddress});
        
        storedOrderData = await orderbookManager.getOrder(id, {from: deployerAddress});
        assert.equal(
            storedOrderData[4],
            4, 
            "order.amount was not properly stored.");

        storedOrderData = await orderbookManager.getOrder(id3, {from: deployerAddress});
        assert.equal(
            storedOrderData[4],
            2, 
            "order.amount was not properly stored.");
    });

    it('Delete Order', async () => {
        await TruffleAssert.fails(
            orderbookManager.deleteOrder(id, maliciousAddress, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        storedOrderData = await orderbookManager.getOrder(id, {from: deployerAddress});
        assert.equal(
            storedOrderData[1],
            creatorAddress, 
            "Order still exists.");

        await orderbookManager.deleteOrder(id, creatorAddress, {from: deployerAddress});
        storedOrderData = await orderbookManager.getOrder(id, {from: deployerAddress});
        assert.notEqual(
            storedOrderData[1],
            creatorAddress, 
            "Order was not properly deleted.");
    });
});
