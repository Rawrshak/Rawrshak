const { ethers, upgrades } = require("hardhat");

async function main() {
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    const [deployer] = await ethers.getSigners();
    
    // Todo: Replace Private key with the Testnet Deployer wallet
    // const deployer = new ethers.Wallet(process.env.KOVAN_PRIVATE_KEY, provider)
  
    console.log("Deploying RAWR token contract");

    // Todo: Comment this out for Testnet deployment
    MockToken = await ethers.getContractFactory("MockToken");
    rawr = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
    await rawr.mint(deployer.address, ethers.BigNumber.from(100000000).mul(_1e18));

    // Todo: Replace this with the correct RAWR token address
    // const rawr = MockToken.attach("0x...");

    console.log("RAWR Token deployed to:", rawr.address);
    console.log("\n");
    
    console.log("Deploying Address Resolver Contract");
    AddressResolver = await ethers.getContractFactory("AddressResolver");
    resolver = await upgrades.deployProxy(AddressResolver, []);
    console.log("AddressResolver deployed to:", resolver.address);
    console.log("\n");
    

    console.log("Deploying Exchange Contracts");
    NftEscrow = await ethers.getContractFactory("NftEscrow");
    Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
    ExecutionManager = await ethers.getContractFactory("ExecutionManager");
    Orderbook = await ethers.getContractFactory("Orderbook");
    RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    Exchange = await ethers.getContractFactory("Exchange");
    ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
    
    // Deploy Internal Exchange contracts
    nftEscrow = await upgrades.deployProxy(NftEscrow, []);
    tokenEscrow = await upgrades.deployProxy(Erc20Escrow, []);
    feesEscrow = await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]);
    orderbook = await upgrades.deployProxy(Orderbook, [resolver.address]);
    executionManager = await upgrades.deployProxy(ExecutionManager, [resolver.address]);
    royaltyManager = await upgrades.deployProxy(RoyaltyManager, [resolver.address]);

    var addresses = [
        tokenEscrow.address,
        nftEscrow.address,
        feesEscrow.address,
        orderbook.address,
        executionManager.address,
        royaltyManager.address,
    ];

    var escrowIds = [
        "0x29a264aa",
        "0x87d4498b",
        "0x7f170836",
        "0xd9ff7618",
        "0x018869a9",
        "0x2c7e992e"
    ];
    await resolver.registerAddress(escrowIds, addresses);

    // Register the managers
    await nftEscrow.registerManager(executionManager.address);
    await tokenEscrow.registerManager(executionManager.address);
    await tokenEscrow.registerManager(royaltyManager.address);
    await feesEscrow.registerManager(royaltyManager.address);

    // Deploy Exchange contract
    exchange = await upgrades.deployProxy(Exchange, [royaltyManager.address, orderbook.address, executionManager.address]);
    
    // set ownership of managers to exchange contract
    await royaltyManager.transferOwnership(exchange.address);
    await orderbook.transferOwnership(exchange.address);
    await executionManager.transferOwnership(exchange.address);
    
    // Add RAWR token as a supported payment option
    await exchange.addSupportedToken(rawr.address);

    console.log("Exchange deployed to:", exchange.address);
    console.log("\n");

    console.log("Deploying Staking Contracts");
    Staking = await ethers.getContractFactory("Staking");
    staking = await upgrades.deployProxy(Staking, [rawr.address, resolver.address]);
    await feesEscrow.registerManager(staking.address);
    console.log("Staking deployed to:", staking.address);
    console.log("\n");

    // Content Contracts
    console.log("Deploying Content Contracts");
    
    AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    ContentStorage = await ethers.getContractFactory("ContentStorage");
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    ContentFactory = await ethers.getContractFactory("ContentFactory");

    // Deploy Implementation contracts
    accessControlManagerImpl = await AccessControlManager.deploy();
    contentImpl = await Content.deploy();
    contentStorageImpl = await ContentStorage.deploy();
    contentManagerImpl = await ContentManager.deploy();

    // Initialize Content Clone Factory
    contentFactory = await upgrades.deployProxy(ContentFactory, [contentImpl.address, contentManagerImpl.address, contentStorageImpl.address, accessControlManagerImpl.address]);

    console.log("ContentFactory deployed to:", contentFactory.address);
    console.log("\n");

    // setting up resolver addresses
    // register the exchange contracts on the address resolver
    var addresses = [
        exchange.address,
        staking.address,
        contentFactory.address,
        rawr.address
    ];

    var escrowIds = [
        "0xeef64103",
        "0x1b48faca",
        "0xdb337f7d",
        "0x3d13c043"
    ];
    await resolver.registerAddress(escrowIds, addresses);

    // Deployment Contracts on Optimism Local Node
    // RAWR Token deployed to: 0xa85233C63b9Ee964Add6F2cffe00Fd84eb32338f
    // AddressResolver deployed to: 0x09635F643e140090A9A8Dcd712eD6285858ceBef
    // Exchange deployed to: 0x5eb3Bc0a489C5A8288765d2336659EbCA68FCd00
    // Staking deployed to: 0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575
    // ContentFactory deployed to: 0xFD471836031dc5108809D173A067e8486B9047A3
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });