const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Exchange Contract', ()=> {
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
        RawrToken = await ethers.getContractFactory("RawrToken");
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
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        content = Content.attach(deployedContracts[0].args.content);
        contentManager = ContentManager.attach(deployedContracts[0].args.contentManager);
            
        // Add 2 assets
        // Asset 1 has 200 basis points towards creator 1
        // Asset 2 has 200 basis points towards creator 1, 100 basis points towards creator 2
        var asset = [
            [1, "arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, creator1Address.address, 20000],
            [2, "arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, ethers.constants.AddressZero, 0],
        ];

        await contentManager.addAssetBatch(asset);

        // Mint an asset
        var mintData = [playerAddress.address, [1, 2], [10, 1], 0, ethers.constants.AddressZero, []];
        await contentManager.mintBatch(mintData);
        
        mintData = [player2Address.address, [1, 2], [10, 10], 0, ethers.constants.AddressZero, []];
        await contentManager.mintBatch(mintData);
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await upgrades.deployProxy(RawrToken, [ethers.BigNumber.from(100000000).mul(_1e18)]);
        
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
    });

    describe("Functional Tests", () => {
        it('Place buy order', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
    
            var orderData = [
                [content.address, 1],
                player2Address.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                1,
                true
            ];
    
            await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));
    
            var tx = await exchange.connect(player2Address).placeOrder(orderData);
            var receipt = await tx.wait();
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;
    
            order = await exchange.getOrder(orderId);
            expect(order.owner).to.equal(player2Address.address);
    
            var tokenEscrowAddr = await exchange.tokenEscrow();
            expect(tokenEscrowAddr).to.equal(tokenEscrow.address);
    
            exchangeTokenEscrow = Erc20Escrow.attach(tokenEscrowAddr);
            expect(await exchangeTokenEscrow.escrowedTokensByOrder(orderId)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
            expect(await rawrToken.balanceOf(exchangeTokenEscrow.address)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
        });

        it('Place sell order', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
            var orderData = [
                [content.address, 1],
                playerAddress.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                1,
                false
            ];
    
            await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);
            
            var tx = await exchange.connect(playerAddress).placeOrder(orderData);
            var receipt = await tx.wait();
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;
                
            order = await exchange.getOrder(orderId);
            expect(order.owner).to.equal(playerAddress.address);
    
            var nftEscrowAddr = await exchange.nftsEscrow();
            expect(nftEscrowAddr).to.equal(nftEscrow.address);
    
            var exchangeNftEscrow = await NftEscrow.attach(nftEscrowAddr);
            expect(await exchangeNftEscrow.escrowedAmounts(orderId)).to.equal(1);
            expect(await content.balanceOf(exchangeNftEscrow.address, 1)).to.equal(1);
        });
        
        it('Delete Orders', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();

            var orderData = [
                [content.address, 1],
                player2Address.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                1,
                true
            ];

            await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

            var tx = await exchange.connect(player2Address).placeOrder(orderData);
            var receipt = await tx.wait();
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
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
                [content.address, 1],
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
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;

    
            // player 2 fills the buy order by selling the asset and receiving payment minus royalties
            await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);
            
            expect(await exchange.connect(player2Address).fillBuyOrder([orderId], [1]))
                .to.emit(exchange, 'BuyOrdersFilled');
            
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
                [content.address, 1],
                playerAddress.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                1,
                false
            ];
    
            await content.connect(playerAddress).setApprovalForAll(await exchange.nftsEscrow(), true);
            
            var tx = await exchange.connect(playerAddress).placeOrder(orderData);
            var receipt = await tx.wait();
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;
    
            // player 2 fills the buy order by selling the asset and receiving payment minus royalties
            await rawrToken.connect(player2Address).approve(await exchange.tokenEscrow(), ethers.BigNumber.from(1000).mul(_1e18));

            expect(await exchange.connect(player2Address).fillSellOrder([orderId], [1]))
                .to.emit(exchange, 'SellOrdersFilled');
            
            // Player 2 originally has 10, but after buying 1 more, he should have 11
            expect(await content.balanceOf(player2Address.address, 1)).to.equal(11);
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
            expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(3).mul(_1e18));
        });
    });

    describe("Claim Orders", () => {
        it('Claim Fulfilled order', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
    
            var orderData = [
                [content.address, 1],
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
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;
    
            // player 2 fills the buy order by selling the asset and receiving payment minus royalties
            await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);
            
            expect(await exchange.connect(player2Address).fillBuyOrder([orderId], [1]))
                .to.emit(exchange, 'BuyOrdersFilled');
            
            // Claim player 1's purchased asset
            await exchange.connect(playerAddress).claimOrders([orderId]);
            
            // Player 1 originally has 10, but after buying 1 more, he should have 11
            expect(await content.balanceOf(playerAddress.address, 1)).to.equal(11);
        });
    
        it('Claim Creator Royalties', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
    
            var orderData = [
                [content.address, 1],
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
            var ordersPlaced = receipt.events?.filter((x) => {return x.event == "OrderPlaced"});
            var orderId = ordersPlaced[0].args.orderId;
    
            // player 2 fills the buy order by selling the asset and receiving payment minus royalties
            await content.connect(player2Address).setApprovalForAll(await exchange.nftsEscrow(), true);
            expect(await exchange.connect(player2Address).fillBuyOrder([orderId], [1]))
                .to.emit(exchange, 'BuyOrdersFilled');
            
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
