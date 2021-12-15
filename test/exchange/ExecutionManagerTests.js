const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Execution Manager Contract Tests', ()=> {
    var deployerAddress, playerAddress, player2Address, creator1Address, creator2Address, invalidTokenAddress;

    // NFT
    var contentFactory;
    var content;
    var contentManager;

    // Rawr Token 
    var rawrToken;

    // Address Resolver
    var resolver;

    var tokenEscrow;
    var nftEscrow;
    var orderbook;
    var executionManager;
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {
        [deployerAddress, playerAddress, player2Address, creator1Address, creator2Address, invalidTokenAddress] = await ethers.getSigners();

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
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);
            
        // Add 2 assets
        var asset = [
            ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-2", "arweave.net/tx/private-uri-2", 100, ethers.constants.AddressZero, 0],
        ];

        await contentManager.addAssetBatch(asset);
        
        // Mint an asset
        var mintData = [playerAddress.address, [0], [10], 0, ethers.constants.AddressZero, []];
        await content.connect(deployerAddress).mintBatch(mintData);
        
        mintData = [player2Address.address, [1], [5], 0, ethers.constants.AddressZero, []];
        await content.connect(deployerAddress).mintBatch(mintData);
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
        await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    }

    async function ExchangeSetup() {
        // Setup Content Escrow
        nftEscrow = await upgrades.deployProxy(NftEscrow, []);
        tokenEscrow = await upgrades.deployProxy(Erc20Escrow, []);

        // Setup Orderbook
        orderbook = await upgrades.deployProxy(Orderbook, [resolver.address]);

        // register the managers
        var addresses = [tokenEscrow.address, nftEscrow.address, orderbook.address];
        var escrowIds = ["0x29a264aa", "0x87d4498b", "0xd9ff7618"];
        await resolver.registerAddress(escrowIds, addresses);

        // Register the execution manager
        await nftEscrow.registerManager(executionManager.address);
        await tokenEscrow.registerManager(executionManager.address);

        // exchange.addToken
        await executionManager.addSupportedToken(rawrToken.address);
    }

    beforeEach(async () => {
        executionManager = await upgrades.deployProxy(ExecutionManager, [resolver.address]);
    });
    
    describe("Basic Tests", () => {
        it('Check if Execution Manager was deployed properly', async () => {
            expect(executionManager.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Supports the Execution Manager Interface', async () => {
            // IExecutionManager Interface
            expect(await executionManager.supportsInterface("0x0f1fb8dd")).to.equal(true);
        });
        
        it('Verify Escrows and token address', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
    
            expect(await executionManager.verifyToken(rawrToken.address)).to.equal(true);
            expect(await executionManager.tokenEscrow()).to.equal(tokenEscrow.address);
            expect(await executionManager.nftsEscrow()).to.equal(nftEscrow.address);
        });
        

        it('Verify Token is supported', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();

            expect(await executionManager.verifyToken(rawrToken.address)).to.equal(true);
            expect(await executionManager.verifyToken(invalidTokenAddress.address)).to.equal(false);
        });
    });

    describe("Buy Orders", () => {
        it('Place Buy Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
    
            await rawrToken.connect(playerAddress).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress.address, ethers.BigNumber.from(2000).mul(_1e18));
            
            expect(await tokenEscrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(2000).mul(_1e18));
        });
        
        it('Execute Buy Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();

            await rawrToken.connect(playerAddress).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress.address, ethers.BigNumber.from(2000).mul(_1e18));
            
            var orders = [1];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [1];
            var asset = [content.address, 1];

            await content.connect(player2Address).setApprovalForAll(nftEscrow.address, true);
            await executionManager.executeBuyOrder(player2Address.address, orders, paymentPerOrder, amounts, asset);

            expect(await tokenEscrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
            

            var assetData = await nftEscrow.escrowedAsset(1);
            expect(assetData.contentAddress).to.equal(content.address);
            expect(assetData.tokenId).to.equal(1);
        });
        
        it('Invalid Execute Buy Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
            
            await rawrToken.connect(playerAddress).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.placeBuyOrder(1, rawrToken.address, playerAddress.address, ethers.BigNumber.from(2000).mul(_1e18));

            var orders = [1, 2];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [1];
            var asset = [content.address, 2];

            await content.connect(player2Address).setApprovalForAll(nftEscrow.address, true);
            await expect(executionManager.executeBuyOrder(player2Address.address, orders, paymentPerOrder, amounts, asset)).to.be.reverted;
            
            paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18), ethers.BigNumber.from(1000).mul(_1e18)];
            await expect(executionManager.executeBuyOrder(player2Address.address, orders, paymentPerOrder, amounts, asset)).to.be.reverted;
        });

    });

    describe("Sell Orders", () => {
        it('Place Sell Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
    
            await content.connect(playerAddress).setApprovalForAll(nftEscrow.address, true);
            await executionManager.placeSellOrder(1, playerAddress.address, [content.address, 0], 2);
            
            expect(await nftEscrow.escrowedAmounts(1)).to.equal(2);
        });

        it('Execute Sell Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
    
            await content.connect(playerAddress).setApprovalForAll(nftEscrow.address, true);
            await executionManager.placeSellOrder(1, playerAddress.address, [content.address, 0], 2);
    
            var orders = [1];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [1];
    
            await rawrToken.connect(player2Address).approve(tokenEscrow.address, ethers.BigNumber.from(1000).mul(_1e18));
            await executionManager.executeSellOrder(player2Address.address, orders, paymentPerOrder, amounts, rawrToken.address);
    
            expect(await tokenEscrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
        });
    
        it('Invalid Execute Sell Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
    
            await content.connect(playerAddress).setApprovalForAll(nftEscrow.address, true);
            await executionManager.placeSellOrder(1, playerAddress.address, [content.address, 0], 2);
    
            var orders = [1, 2];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [1];
    
            // orders and payment order length doesn't match
            await rawrToken.connect(player2Address).approve(tokenEscrow.address, ethers.BigNumber.from(1000).mul(_1e18));
            
            await expect(executionManager.executeSellOrder(player2Address.address, orders, paymentPerOrder, amounts, rawrToken.address)).to.be.reverted;
        });
    });
    
    describe("Claim and Fill Order", () => {
        it('Delete Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
    
            var sellOrderData = [ 
                [content.address, 0],
                playerAddress.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                2,
                false
            ];
    
            var id = await orderbook.ordersLength();
            await orderbook.placeOrder(sellOrderData);
            await content.connect(playerAddress).setApprovalForAll(nftEscrow.address, true);
            await executionManager.placeSellOrder(id, playerAddress.address, [content.address, 0], 2);
            await executionManager.cancelOrders([id]);
    
            expect(await nftEscrow.escrowedAmounts(id)).to.equal(0);
            
            var buyOrderData = [ 
                [content.address, 1],
                playerAddress.address,
                rawrToken.address,
                web3.utils.toWei('1000', 'ether'),
                2,
                true
            ];
    
            id = await orderbook.ordersLength();
            await orderbook.placeOrder(buyOrderData);
            await rawrToken.connect(playerAddress).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.placeBuyOrder(id, rawrToken.address, playerAddress.address, web3.utils.toWei('2000', 'ether'));
            
            await executionManager.cancelOrders([id]);
    
            expect(await tokenEscrow.escrowedTokensByOrder(id)).to.equal(0);
        });

        it('Claim Assets from Filled Buy Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();
    
            // Create and fill a buy order
            var buyOrderData = [ 
                [content.address, 1],
                playerAddress.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                2,
                true
            ];
            
            var orderId = await orderbook.ordersLength()
            await orderbook.placeOrder(buyOrderData);
            
            await rawrToken.connect(playerAddress).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.placeBuyOrder(orderId, rawrToken.address, playerAddress.address, ethers.BigNumber.from(2000).mul(_1e18));
    
            var orders = [orderId];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [2];
            var asset = [content.address, 1];
    
            await content.connect(player2Address).setApprovalForAll(nftEscrow.address, true);
            await executionManager.executeBuyOrder(player2Address.address, orders, paymentPerOrder, amounts, asset);
    
            await executionManager.claimOrders(playerAddress.address, orders);
    
            expect(await nftEscrow.escrowedAmounts(orderId)).to.equal(0);
        });
        

        it('Claim Tokens from Filled Sell Order', async () => {
            await RawrTokenSetup();
            await ExchangeSetup();
            await ContentContractSetup();

            // Create and fill a sell order
            var sellOrderData = [ 
                [content.address, 0],
                playerAddress.address,
                rawrToken.address,
                ethers.BigNumber.from(1000).mul(_1e18),
                2,
                false
            ];

            var id = await orderbook.ordersLength();
            await orderbook.placeOrder(sellOrderData);

            await content.connect(playerAddress).setApprovalForAll(nftEscrow.address, true);
            await executionManager.placeSellOrder(id, playerAddress.address, [content.address, 0], 2);

            var orders = [id];
            var paymentPerOrder = [ethers.BigNumber.from(1000).mul(_1e18)];
            var amounts = [2];

            await rawrToken.connect(player2Address).approve(tokenEscrow.address, ethers.BigNumber.from(2000).mul(_1e18));
            await executionManager.executeSellOrder(player2Address.address, orders, paymentPerOrder, amounts, rawrToken.address);

            await executionManager.claimOrders(playerAddress.address, orders);

            expect(await tokenEscrow.escrowedTokensByOrder(1)).to.equal(0);
        });
    });

});
