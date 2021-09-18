const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Orderbook = artifacts.require("Orderbook");
const AddressResolver = artifacts.require("AddressResolver");
const TruffleAssert = require("truffle-assertions");

contract('Orderbook Contract tests', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        rawrTokenAddress,           // execution manager address
        contentAddress,             // content nft Address
        creatorAddress,             // creator Address
    ] = accounts;

    const orderbook_hash = "0xd9ff7618";
    var orderbook;
    
    var id;
    var orderData1= [ 
        [contentAddress, 1],
        creatorAddress,
        rawrTokenAddress,
        web3.utils.toWei('10000', 'ether'),
        5,
        true
    ];
    var orderData2= [ 
        [contentAddress, 2],
        creatorAddress,
        rawrTokenAddress,
        web3.utils.toWei('5000', 'ether'),
        5,
        false
    ];
    var orderData3= [ 
        [contentAddress, 1],
        creatorAddress,
        rawrTokenAddress,
        web3.utils.toWei('2000', 'ether'),
        3,
        true
    ];

    before(async () => {
        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});
    });

    beforeEach(async () => {
        orderbook = await Orderbook.new();
        await orderbook.__Orderbook_init(resolver.address, {from: deployerAddress});

        ids = [orderbook_hash];
        addresses = [orderbook.address];
        await resolver.registerAddress(ids, addresses, {from: deployerAddress});
    });

    it('Check if Orderbook was deployed properly', async () => {
        assert.equal(
            orderbook.address != 0x0,
            true,
            "Orderbook was not deployed properly.");
    });

    it('Supports the Orderbook Interface', async () => {
        // INTERFACE_ID_ORDERBOOK = 0x0000000B
        assert.equal(
            await orderbook.supportsInterface("0x0000000B"),
            true, 
            "the orderbook doesn't support the Orderbook interface");
    });

    it('Place an Order', async () => {
        
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});

        // check if the order was saved
        storedOrder = await orderbook.getOrder(id, {from: deployerAddress});

        assert.equal(
            storedOrder.asset.contentAddress == orderData1[0][0] && 
            storedOrder.asset.tokenId == orderData1[0][1],
            true, 
            "order.asset was not properly stored.");
        assert.equal(
            storedOrder.owner,
            orderData1[1], 
            "order.owner was not properly stored.");
        assert.equal(
            storedOrder.token,
            orderData1[2], 
            "order.token was not properly stored.");
            
        assert.equal(
            storedOrder.price,
            orderData1[3], 
            "order.price was not properly stored.");
            
        assert.equal(
            storedOrder.amountOrdered,
            orderData1[4], 
            "order.amountOrdered was not properly stored.");
            
        assert.equal(
            storedOrder.amountFilled,
            0, 
            "order.amountFilled was not properly stored.");
            
        assert.equal(
            storedOrder.isBuyOrder,
            orderData1[5], 
            "order.isBuyOrder was not properly stored.");
            
        assert.equal(
            storedOrder.state,
            0, // Ready
            "order.state was not properly stored.");
    });

    it('Place multiple Orders', async () => {        
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});

        id2 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData2, {from: deployerAddress});

        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});
        
        // check if the order was saved
        storedOrder = await orderbook.getOrder(id3, {from: deployerAddress});

        assert.equal(
            storedOrder.asset.contentAddress == orderData3[0][0] && 
            storedOrder.asset.tokenId == orderData3[0][1],
            true, 
            "order.asset was not properly stored.");
        assert.equal(
            storedOrder.owner,
            orderData3[1], 
            "order.owner was not properly stored.");
        assert.equal(
            storedOrder.token,
            orderData3[2], 
            "order.token was not properly stored.");
            
        assert.equal(
            storedOrder.price,
            orderData3[3], 
            "order.price was not properly stored.");
            
        assert.equal(
            storedOrder.amountOrdered,
            orderData3[4], 
            "order.amountOrdered was not properly stored.");
            
        assert.equal(
            storedOrder.amountFilled,
            0, 
            "order.amountFilled was not properly stored.");
            
        assert.equal(
            storedOrder.isBuyOrder,
            orderData3[5], 
            "order.isBuyOrder was not properly stored.");
            
        assert.equal(
            storedOrder.state,
            0, // Ready
            "order.state was not properly stored.");
    });

    it('Verifies orders are of the same asset', async () => {
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});
        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});

        assert.equal(
            await orderbook.verifyOrdersExist(
                [id, id3],
                {from: deployerAddress}
            ),
            true,
            "Orders do not exist."
        )

        assert.equal(
            await orderbook.verifyAllOrdersData(
                [id, id3],
                true,
                {from: deployerAddress}
            ),
            true,
            "Not all orders are for the same asset."
        )
    });

    it('Get Payment totals', async () => {
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});
        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});

        var paymentTotals = await orderbook.getPaymentTotals([id, id3], [1, 1]);

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
        
        paymentTotals = await orderbook.getPaymentTotals([id, id3], [3, 3]);
        
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

    it('Fill Orders', async () => {
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});
        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});

        await orderbook.fillOrders([id, id3], [1, 1], {from: deployerAddress});
        
        storedOrder = await orderbook.getOrder(id, {from: deployerAddress});
        assert.equal(
            storedOrder.amountFilled,
            1, 
            "order.amountOrdered was not properly stored.");
        assert.equal(
            storedOrder.state,
            1, // State.PARTIALLY_FILLED
            "order.state was not properly updated to PARTIALLY_FILLED");

        storedOrder = await orderbook.getOrder(id3, {from: deployerAddress});
        assert.equal(
            storedOrder.amountFilled,
            1, 
            "order.amount was not properly stored.");
        assert.equal(
            storedOrder.state,
            1, // State.PARTIALLY_FILLED
            "order.state was not properly updated to PARTIALLY_FILLED");
    });

    it('Claim Orders', async () => {
        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});

        await orderbook.fillOrders([id3], [3], {from: deployerAddress});
        
        storedOrder = await orderbook.getOrder(id3, {from: deployerAddress});
        assert.equal(
            storedOrder.amountFilled,
            3, 
            "order.amountOrdered was not properly stored.");
        assert.equal(
            storedOrder.state,
            2, // State.FILLED
            "order.state was not properly updated to FILLED");
        
        // Claim orders
        await orderbook.claimOrders([id3], {from: deployerAddress});

        storedOrder = await orderbook.getOrder(id3, {from: deployerAddress});
        assert.equal(
            storedOrder.state,
            3, // State.CLAIMED
            "order.state was not properly updated to CLAIMED");
    });

    it('Cancel Order', async () => {
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});

        await orderbook.cancelOrders([id], {from: deployerAddress});
        storedOrder = await orderbook.getOrder(id, {from: deployerAddress});
        assert.equal(
            storedOrder.state,
            4, // State.CANCELLED
            "Order was not properly cancelled.");
    });

    it('Invalid Operations tests', async () => {
        // var id3 = await orderbook.getId(orderData3);
        id = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData1, {from: deployerAddress});
        id3 = await orderbook.ordersLength();
        await orderbook.placeOrder(orderData3, {from: deployerAddress});
        
        await TruffleAssert.fails(
            orderbook.getPaymentTotals([id, id3], [1, 10]),
            TruffleAssert.ErrorType.REVERT
        );
        
        await orderbook.fillOrders([id3], [3], {from: deployerAddress});
        
        // cannot cancel filled orders
        await TruffleAssert.fails(
            orderbook.cancelOrders([id3]),
            TruffleAssert.ErrorType.REVERT
        );

        await orderbook.cancelOrders([id], {from: deployerAddress});
        // cannot cancel already cancelled orders
        await TruffleAssert.fails(
            orderbook.cancelOrders([id]),
            TruffleAssert.ErrorType.REVERT
        );
    });
});
