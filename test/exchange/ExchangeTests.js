const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Exchange Contract', () => {
  var deployerAddress, playerAddress, player2Address, creator1Address, staker1;

  // NFT
  var content;
  var contentFactory;
  var contentManager;

  // Rawr Token 
  var rawrToken;

  // Exchange contract
  var exchange;

  const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

  before(async () => {
    [deployerAddress, playerAddress, player2Address, creator1Address, staker1] = await ethers.getSigners();

    AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    ContentStorage = await ethers.getContractFactory("ContentStorage");
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    ContentFactory = await ethers.getContractFactory("ContentFactory");
    NftEscrow = await ethers.getContractFactory("NftEscrow");
    MockToken = await ethers.getContractFactory("MockToken");
    Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
    Orderbook = await ethers.getContractFactory("Orderbook");
    ExecutionManager = await ethers.getContractFactory("ExecutionManager");
    AddressResolver = await ethers.getContractFactory("AddressResolver");
    ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
    RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    Exchange = await ethers.getContractFactory("Exchange");
    MockStaking = await ethers.getContractFactory("MockStaking");

    originalAccessControlManager = await AccessControlManager.deploy();
    originalContent = await Content.deploy();
    originalContentStorage = await ContentStorage.deploy();
    originalContentManager = await ContentManager.deploy();

    // Initialize Clone Factory
    contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);

    resolver = await upgrades.deployProxy(AddressResolver, []);
  });

  async function ContentContractSetup() {
    var tx = await contentFactory.createContracts(creator1Address.address, 20000, "arweave.net/tx-contract-uri");
    var receipt = await tx.wait();
    var deployedContracts = receipt.events?.filter((x) => { return x.event == "ContractsDeployed" });

    // To figure out which log contains the ContractDeployed event
    content = await Content.attach(deployedContracts[0].args.content);
    contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

    // Add 2 assets
    // Asset 1 has 200 basis points towards creator 1
    // Asset 2 has 200 basis points towards creator 1, 100 basis points towards creator 2
    var asset = [
      ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, creator1Address.address, 20000],
      ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, ethers.constants.AddressZero, 0],
    ];

    await contentManager.addAssetBatch(asset);

    // Mint an asset
    var mintData = [playerAddress.address, [0, 1], [10, 1], 0, ethers.constants.AddressZero, []];
    await content.connect(deployerAddress).mintBatch(mintData);

    mintData = [player2Address.address, [0, 1], [10, 10], 0, ethers.constants.AddressZero, []];
    await content.connect(deployerAddress).mintBatch(mintData);
  }

  async function RawrTokenSetup() {
    // Setup RAWR token
    rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
    await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));

    // Give player 1 20000 RAWR tokens
    await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
    await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(10000).mul(_1e18));

    // exchange.addToken
    await exchange.addSupportedToken(rawrToken.address);
  }

  async function ExchangeSetup() {
    // Setup Content Escrow
    nftEscrow = await upgrades.deployProxy(NftEscrow, []);
    tokenEscrow = await upgrades.deployProxy(Erc20Escrow, []);
    feesEscrow = await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]);

    orderbook = await upgrades.deployProxy(Orderbook, [resolver.address]);
    executionManager = await upgrades.deployProxy(ExecutionManager, [resolver.address]);
    royaltyManager = await upgrades.deployProxy(RoyaltyManager, [resolver.address]);

    staking = await MockStaking.deploy(resolver.address);

    // register the exchange contracts on the address resolver
    var addresses = [tokenEscrow.address, nftEscrow.address, feesEscrow.address, orderbook.address, executionManager.address, royaltyManager.address, staking.address];
    var escrowIds = ["0x29a264aa", "0x87d4498b", "0x7f170836", "0xd9ff7618", "0x018869a9", "0x2c7e992e", "0x1b48faca"];
    await resolver.registerAddress(escrowIds, addresses);

    // Register the managers
    await nftEscrow.registerManager(executionManager.address);
    await tokenEscrow.registerManager(executionManager.address);
    await tokenEscrow.registerManager(royaltyManager.address);
    await feesEscrow.registerManager(royaltyManager.address);
    await feesEscrow.registerManager(staking.address);

    // add stakers
    await staking.connect(staker1).stake(ethers.BigNumber.from(100).mul(_1e18));
    await feesEscrow.setRate(3000);

    exchange = await upgrades.deployProxy(Exchange, [royaltyManager.address, orderbook.address, executionManager.address]);
    await royaltyManager.transferOwnership(exchange.address);
    await orderbook.transferOwnership(exchange.address);
    await executionManager.transferOwnership(exchange.address);
  }

  beforeEach(async () => {
    await ExchangeSetup();
  });

  describe("Basic Tests", () => {
    it('Check if Exchange was deployed properly', async () => {
      expect(exchange.address).not.equal(ethers.constants.AddressZero);
    });

    it('Supports the Exchange Interface', async () => {
        // IExchange Interface
        expect(await exchange.supportsInterface("0x581b76ff")).to.equal(true);
    });
  });

  describe("Functional Tests", () => {
    it('Place buy order', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        player2Address.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        true
      ];

      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      var tx = await exchange.connect(player2Address).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      order = await exchange.getOrder(orderId);
      expect(order.owner).to.equal(player2Address.address);

      var tokenEscrowAddr = await exchange.tokenEscrow();
      expect(tokenEscrowAddr).to.equal(tokenEscrow.address);

      exchangeTokenEscrow = await Erc20Escrow.attach(tokenEscrowAddr);
      expect(await exchangeTokenEscrow.escrowedTokensByOrder(orderId)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
      expect(await rawrToken.balanceOf(exchangeTokenEscrow.address)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
    });

    it('Place sell order', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();
      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        false
      ];

      await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);

      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      order = await exchange.getOrder(orderId);
      expect(order.owner).to.equal(playerAddress.address);

      var nftEscrowAddr = await exchange.nftsEscrow();
      expect(nftEscrowAddr).to.equal(nftEscrow.address);

      var exchangeNftEscrow = await NftEscrow.attach(nftEscrowAddr);
      expect(await exchangeNftEscrow.escrowedAmounts(orderId)).to.equal(1);
      expect(await content.balanceOf(exchangeNftEscrow.address, 0)).to.equal(1);
    });

    it('Delete Orders', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        player2Address.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        true
      ];

      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      var tx = await exchange.connect(player2Address).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      expect(await exchange.connect(player2Address).cancelOrders([orderId]))
        .to.emit(exchange, 'OrdersDeleted');

      var tokenEscrowAddr = await exchange.tokenEscrow();
      var exchangeTokenEscrow = await Erc20Escrow.attach(tokenEscrowAddr);
      expect(await exchangeTokenEscrow.escrowedTokensByOrder(orderId)).to.equal(0);
      expect(await rawrToken.balanceOf(exchangeTokenEscrow.address)).to.equal(0);
      expect(await rawrToken.balanceOf(player2Address.address)).to.equal(ethers.BigNumber.from(10000).mul(_1e18));
    });
  });

  describe("Fill Orders", () => {
    it('Fill buy order', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        true
      ];

      // Player 1 Creates a buy order for an asset
      await rawrToken.connect(playerAddress).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;


      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);

      expect(await exchange.connect(player2Address).fillBuyOrder([orderId], 1, ethers.BigNumber.from(1000).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled');

      // platform has 30 basis points and creator has 200 basis points from royalties so player2Address should only have
      // 10000 (initial) + 977 from the sale of their asset
      expect(await rawrToken.balanceOf(player2Address.address)).to.equal(ethers.BigNumber.from(10977).mul(_1e18));
      expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
      expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
    });

    it('Fill sell order', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        false
      ];

      await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);

      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      expect(await exchange.connect(player2Address).fillSellOrder([orderId], 1, ethers.BigNumber.from(1000).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled');

      // Player 2 originally has 10, but after buying 1 more, he should have 11
      expect(await content.balanceOf(player2Address.address, 0)).to.equal(11);
      expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
      expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
    });

    it('Multiple Buy orders', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(100).mul(_1e18),
        2,
        false
      ];
      var order2Data = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(100).mul(_1e18),
        4,
        false
      ];

      // Player 1 places 2 orders of the same asset
      await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);
      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var order1Id = ordersPlaced[0].args.orderId;

      tx = await exchange.connect(playerAddress).placeOrder(order2Data);
      receipt = await tx.wait();
      ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var order2Id = ordersPlaced[0].args.orderId;

      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(400).mul(_1e18));

      // Player 2 buys 4 items from the 2 orders
      expect(await exchange.connect(player2Address).fillSellOrder([order1Id, order2Id], 4, ethers.BigNumber.from(400).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled')
        .withArgs(player2Address.address, [order1Id, order2Id], [2, 2], [content.address, 0], rawrToken.address, 4, ethers.BigNumber.from(400).mul(_1e18));

      // player 2 should now have 4 assets
      expect(await content.balanceOf(player2Address.address, 0)).to.equal(14);

      // check order data
      order = await exchange.getOrder(order1Id);
      expect(order.amountFilled).to.equal(2);

      order = await exchange.getOrder(order2Id);
      expect(order.amountFilled).to.equal(2);
    });

    it('Partial Order fill', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(100).mul(_1e18),
        1,
        false
      ];
      var order2Data = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(100).mul(_1e18),
        4,
        false
      ];

      // Player 1 places 2 orders of the same asset
      await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);
      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var order1Id = ordersPlaced[0].args.orderId;

      tx = await exchange.connect(playerAddress).placeOrder(order2Data);
      receipt = await tx.wait();
      ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var order2Id = ordersPlaced[0].args.orderId;

      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(400).mul(_1e18));

      // Fill Order 1 first
      expect(await exchange.connect(player2Address).fillSellOrder([order1Id], 2, ethers.BigNumber.from(100).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled')
        .withArgs(player2Address.address, [order1Id], [1], [content.address, 0], rawrToken.address, 1, ethers.BigNumber.from(100).mul(_1e18));

      // // Player 2 buys 2 items from the 2 orders, ignoring order
      expect(await exchange.connect(player2Address).fillSellOrder([order1Id, order2Id], 3, ethers.BigNumber.from(300).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled')
        .withArgs(player2Address.address, [order1Id, order2Id], [0, 3], [content.address, 0], rawrToken.address, 3, ethers.BigNumber.from(300).mul(_1e18));

      // player 2 should now have 4 assets
      expect(await content.balanceOf(player2Address.address, 0)).to.equal(14);

      // check order data
      order = await exchange.getOrder(order1Id);
      expect(order.amountFilled).to.equal(1);

      order = await exchange.getOrder(order2Id);
      expect(order.amountFilled).to.equal(3);
    });

    it('Max royalty rate', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      // set royalty rate to max
      await contentManager.setTokenRoyaltiesBatch([[0, creator1Address.address, 200000]]);

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        false
      ];

      await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);

      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      // player 2 fills the sell order by buying the asset and sending payment
      await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      expect(await exchange.connect(player2Address).fillSellOrder([orderId], 1, ethers.BigNumber.from(1000).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled');

      // Player 2 originally has 10, but after buying 1 more, he should have 11
      expect(await content.balanceOf(player2Address.address, 0)).to.equal(11);
      expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
      expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));

      await exchange.connect(creator1Address).claimRoyalties();
      expect(await rawrToken.balanceOf(creator1Address.address)).to.equal(ethers.BigNumber.from(200).mul(_1e18));
      await exchange.connect(playerAddress).claimOrders([orderId]);
      expect(await rawrToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(20797).mul(_1e18));
    });
  });

  describe("Claim Orders", () => {
    it('Claim Fulfilled order', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        true
      ];

      // Player 1 Creates a buy order for an asset
      await rawrToken.connect(playerAddress).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      // Place order, get order id
      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);

      expect(await exchange.connect(player2Address).fillBuyOrder([orderId], 1, ethers.BigNumber.from(1000).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled');

      // Claim player 1's purchased asset
      await exchange.connect(playerAddress).claimOrders([orderId]);

      // Player 1 originally has 10, but after buying 1 more, he should have 11
      expect(await content.balanceOf(playerAddress.address, 0)).to.equal(11);
    });

    it('Claim Creator Royalties', async () => {
      await ContentContractSetup();
      await RawrTokenSetup();

      var orderData = [
        [content.address, 0],
        playerAddress.address,
        rawrToken.address,
        ethers.BigNumber.from(1000).mul(_1e18),
        1,
        true
      ];

      // Player 1 Creates a buy order for an asset
      await rawrToken.connect(playerAddress).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

      // Place order, get order id
      var tx = await exchange.connect(playerAddress).placeOrder(orderData);
      var receipt = await tx.wait();
      var ordersPlaced = receipt.events?.filter((x) => { return x.event == "OrderPlaced" });
      var orderId = ordersPlaced[0].args.orderId;

      // player 2 fills the buy order by selling the asset and receiving payment minus royalties
      await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);
      expect(await exchange.connect(player2Address).fillBuyOrder([orderId], 1, ethers.BigNumber.from(1000).mul(_1e18)))
        .to.emit(exchange, 'OrdersFilled');

      expect(await rawrToken.balanceOf(player2Address.address)).to.equal(ethers.BigNumber.from(10977).mul(_1e18));

      // check claimable royalty for creator address
      var claimable = await exchange.connect(creator1Address).claimableRoyalties();
      expect(claimable.tokens[0]).to.equal(rawrToken.address);
      expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(20).mul(_1e18));

      await exchange.connect(creator1Address).claimRoyalties();
      expect(await rawrToken.balanceOf(creator1Address.address)).to.equal(ethers.BigNumber.from(20).mul(_1e18));
    });

  });



});
