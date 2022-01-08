const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Orderbook Contract tests', () => {
  var deployerAddress, rawrTokenAddress, contentAddress, creatorAddress;

  const orderbook_hash = "0xd9ff7618";
  var orderbook;

  var id;
  var orderData1;
  var orderData2;
  var orderData3;
  const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

  before(async () => {
    [deployerAddress, rawrTokenAddress, contentAddress, creatorAddress] = await ethers.getSigners();
    Orderbook = await ethers.getContractFactory("Orderbook");
    AddressResolver = await ethers.getContractFactory("AddressResolver");

    resolver = await upgrades.deployProxy(AddressResolver, []);

    orderData1 = [
      [contentAddress.address, 1],
      creatorAddress.address,
      rawrTokenAddress.address,
      ethers.BigNumber.from(10000).mul(_1e18),
      5,
      true
    ];
    orderData2 = [
      [contentAddress.address, 2],
      creatorAddress.address,
      rawrTokenAddress.address,
      ethers.BigNumber.from(5000).mul(_1e18),
      5,
      false
    ];
    orderData3 = [
      [contentAddress.address, 1],
      creatorAddress.address,
      rawrTokenAddress.address,
      ethers.BigNumber.from(2000).mul(_1e18),
      3,
      true
    ];
  });

  beforeEach(async () => {
    orderbook = await upgrades.deployProxy(Orderbook, [resolver.address]);

    ids = [orderbook_hash];
    addresses = [orderbook.address];
    await resolver.registerAddress(ids, addresses);
  });

  describe("Basic Tests", () => {
    it('Check if Orderbook was deployed properly', async () => {
      expect(orderbook.address).not.equal(ethers.constants.AddressZero);
    });

    it('Supports the Address resolver Interface', async () => {
      // IOrderbook Interface
      expect(await orderbook.supportsInterface("0x2a24311c")).to.equal(true);
    });
  });

  describe("Placing Orders", () => {
    it('Place an Order', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      // check if the order was saved
      storedOrder = await orderbook.getOrder(id);

      expect(storedOrder.asset.contentAddress).is.equal(orderData1[0][0]);
      expect(storedOrder.asset.tokenId).is.equal(orderData1[0][1]);
      expect(storedOrder.owner).is.equal(orderData1[1]);
      expect(storedOrder.token).is.equal(orderData1[2]);
      expect(storedOrder.price).is.equal(orderData1[3]);
      expect(storedOrder.amountOrdered).is.equal(orderData1[4]);
      expect(storedOrder.amountFilled).is.equal(0);
      expect(storedOrder.isBuyOrder).is.equal(orderData1[5]);
      expect(storedOrder.state).is.equal(0);
    });

    it('Place multiple Orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      id2 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData2);

      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      // check if the order was saved
      storedOrder = await orderbook.getOrder(id2);

      expect(storedOrder.asset.contentAddress).is.equal(orderData2[0][0]);
      expect(storedOrder.asset.tokenId).is.equal(orderData2[0][1]);
      expect(storedOrder.owner).is.equal(orderData2[1]);
      expect(storedOrder.token).is.equal(orderData2[2]);
      expect(storedOrder.price).is.equal(orderData2[3]);
      expect(storedOrder.amountOrdered).is.equal(orderData2[4]);
      expect(storedOrder.amountFilled).is.equal(0);
      expect(storedOrder.isBuyOrder).is.equal(orderData2[5]);
      expect(storedOrder.state).is.equal(0);

      // check if the order was saved
      storedOrder = await orderbook.getOrder(id3);

      expect(storedOrder.asset.contentAddress).is.equal(orderData3[0][0]);
      expect(storedOrder.asset.tokenId).is.equal(orderData3[0][1]);
      expect(storedOrder.owner).is.equal(orderData3[1]);
      expect(storedOrder.token).is.equal(orderData3[2]);
      expect(storedOrder.price).is.equal(orderData3[3]);
      expect(storedOrder.amountOrdered).is.equal(orderData3[4]);
      expect(storedOrder.amountFilled).is.equal(0);
      expect(storedOrder.isBuyOrder).is.equal(orderData3[5]);
      expect(storedOrder.state).is.equal(0);

    });

    it('Get Order Amounts with no filled orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      id2 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData2);

      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var order1 = await orderbook.getOrder(id);
      var order2 = await orderbook.getOrder(id2);
      var order3 = await orderbook.getOrder(id3);

      expect(order1.amountOrdered).is.equal(5);
      expect(order2.amountOrdered).is.equal(5);
      expect(order3.amountOrdered).is.equal(3);
    });

    it('Get Order Amounts with partially filled orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      id2 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData2);

      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      await orderbook.fillOrders([id, id2], [3, 3]);

      var order1 = await orderbook.getOrder(id);
      var order2 = await orderbook.getOrder(id2);
      var order3 = await orderbook.getOrder(id3);

      expect(order1.amountOrdered).is.equal(5);
      expect(order2.amountOrdered).is.equal(5);
      expect(order3.amountOrdered).is.equal(3);
      expect(order1.amountFilled).is.equal(3);
      expect(order2.amountFilled).is.equal(3);
      expect(order3.amountFilled).is.equal(0);
    });

    it('Get Order Amounts with all filled orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      id2 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData2);

      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      await orderbook.fillOrders([id, id2, id3], [3, 5, 3]);

      var order1 = await orderbook.getOrder(id);
      var order2 = await orderbook.getOrder(id2);
      var order3 = await orderbook.getOrder(id3);

      expect(order1.amountOrdered).is.equal(5);
      expect(order2.amountOrdered).is.equal(5);
      expect(order3.amountOrdered).is.equal(3);
      expect(order1.amountFilled).is.equal(3);
      expect(order2.amountFilled).is.equal(5);
      expect(order3.amountFilled).is.equal(3);
    });

    it('Verifies orders are of the same asset', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      expect(await orderbook.verifyOrdersExist([id, id3])).is.equal(true);
      expect(await orderbook.verifyAllOrdersData([id, id3], true)).is.equal(true);
    });
  });

  describe("Transaction Orders", () => {

    it('Get Order Amounts with proper AmountToFill and MaxSpend', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
  
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var amounts = await orderbook.getOrderAmounts([id, id3], 6, ethers.BigNumber.from(52000).mul(_1e18));
    
      // Expect orderAmounts to equal [5, 1] 
      expect(amounts[0][0]).is.equal(5);
      expect(amounts[0][1]).is.equal(1);

      // Expect amounts filled to equal 6
      expect(amounts[1]).is.equal(6);
    });

    it('Get Order Amounts with small AmountToFill', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
  
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var amounts = await orderbook.getOrderAmounts([id, id3], 3, ethers.BigNumber.from(52000).mul(_1e18));
    
      // Expect orderAmounts to equal [3, 0] 
      expect(amounts[0][0]).is.equal(3);
      expect(amounts[0][1]).is.equal(0);

      // Expect amounts filled to equal 3
      expect(amounts[1]).is.equal(3);
    });

    it('Get Order Amounts with small MaxSpend', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
  
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var amounts = await orderbook.getOrderAmounts([id, id3], 6, ethers.BigNumber.from(40000).mul(_1e18));
    
      // Expect orderAmounts to equal [4, 0] 
      expect(amounts[0][0]).is.equal(4);
      expect(amounts[0][1]).is.equal(0);

      // Expect amounts filled to equal 4
      expect(amounts[1]).is.equal(4);
    });

    it('Get Order Amounts with non-exact MaxSpend', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
  
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var amounts = await orderbook.getOrderAmounts([id, id3], 6, ethers.BigNumber.from(25000).mul(_1e18));
    
      // Expect orderAmounts to equal [2, 0] 
      expect(amounts[0][0]).is.equal(2);
      expect(amounts[0][1]).is.equal(0);

      // Expect amounts filled to equal 2
      expect(amounts[1]).is.equal(2);
    });

    it('Get Payment totals', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      var paymentTotals = await orderbook.getPaymentTotals([id, id3], [1, 1]);

      expect(paymentTotals[0]).is.equal(ethers.BigNumber.from(12000).mul(_1e18));
      expect(paymentTotals[1][0]).is.equal(ethers.BigNumber.from(10000).mul(_1e18));
      expect(paymentTotals[1][1]).is.equal(ethers.BigNumber.from(2000).mul(_1e18));

      paymentTotals = await orderbook.getPaymentTotals([id, id3], [3, 3]);
      expect(paymentTotals[0]).is.equal(ethers.BigNumber.from(36000).mul(_1e18));
      expect(paymentTotals[1][0]).is.equal(ethers.BigNumber.from(30000).mul(_1e18));
      expect(paymentTotals[1][1]).is.equal(ethers.BigNumber.from(6000).mul(_1e18));
    });

    it('Fill Orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      await orderbook.fillOrders([id, id3], [1, 1]);

      storedOrder = await orderbook.getOrder(id);
      expect(storedOrder.amountFilled).is.equal(1);
      expect(storedOrder.state).is.equal(1); // State.PARTIALLY_FILLED

      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.amountFilled).is.equal(1);
      expect(storedOrder.state).is.equal(1); // State.PARTIALLY_FILLED
    });

    it('Claim Orders', async () => {
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);

      await orderbook.fillOrders([id3], [3]);

      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.amountFilled).is.equal(3);
      expect(storedOrder.state).is.equal(2); // State.FILLED

      // Claim orders
      await orderbook.claimOrders([id3]);
      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.state).is.equal(3); // State.CLAIMED
    });

    it('Cancel Order', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);

      await orderbook.cancelOrders([id]);
      storedOrder = await orderbook.getOrder(id);
      expect(storedOrder.state).is.equal(4); // State.CANCELLED
    });

    it('Cancel Order after Claim Orders', async () => {
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);
  
      await orderbook.fillOrders([id, id3], [5, 1]);
  
      storedOrder = await orderbook.getOrder(id);
      expect(storedOrder.amountFilled).is.equal(5);
      expect(storedOrder.state).is.equal(2); // State.FILLED
  
      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.amountFilled).is.equal(1);
      expect(storedOrder.state).is.equal(1); // State.PARTIALLY_FILLED

      // Claim orders
      await orderbook.claimOrders([id3]);
      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.state).is.equal(1); // State.PARTIALLY_FILLED

      // Cancel Order 3
      await orderbook.cancelOrders([id3]);
      storedOrder = await orderbook.getOrder(id3);
      expect(storedOrder.state).is.equal(4); // State.CANCELLED
    });
    
    it('Invalid Operations tests', async () => {
      // var id3 = await orderbook.getId(orderData3);
      id = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData1);
      id3 = await orderbook.ordersLength();
      await orderbook.placeOrder(orderData3);
      await orderbook.fillOrders([id3], [3]);

      // cannot cancel filled orders
      await expect(orderbook.cancelOrders([id3])).to.be.reverted;

      await orderbook.cancelOrders([id]);
      // cannot cancel already cancelled orders
      await expect(orderbook.cancelOrders([id])).to.be.reverted;
    });
  });
});
