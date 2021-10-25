const { ethers, upgrades } = require("hardhat");

async function main() {
    const provider = new ethers.providers.JsonRpcProvider(hre.network.config.url)
    const deployer = new ethers.Wallet(process.env.KOVAN_PRIVATE_KEY, provider)
    
    console.log(`Deploying contracts with the account: ${deployer.address}`);
  
    const balance = await deployer.getBalance();
    console.log(`Account Balance: ${web3.utils.fromWei(balance.toString(), 'ether')}`);
    
    // Get RAWR Token
    var rawrAddress = "0xdf973861836d3c5bf77e69f6ccab174445aa8363";
    console.log("RAWR Token deployed to:", rawrAddress);
    
    console.log("Deploying Address Resolver Contract");
    const AddressResolver = await ethers.getContractFactory("AddressResolver");
    const resolver = await upgrades.deployProxy(AddressResolver, []);
    console.log("AddressResolver deployed to:", resolver.address);
    console.log("\n");
    
    console.log("Deploying Exchange Contracts");
    const NftEscrow = await ethers.getContractFactory("NftEscrow");
    const Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
    const ExecutionManager = await ethers.getContractFactory("ExecutionManager");
    const Orderbook = await ethers.getContractFactory("Orderbook");
    const RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");
    const Exchange = await ethers.getContractFactory("Exchange");
    const ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
    
    // Deploy Internal Exchange contracts
    const nftEscrow = await upgrades.deployProxy(NftEscrow, []);
    const tokenEscrow = await upgrades.deployProxy(Erc20Escrow, []);
    const feesEscrow = await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]);
    const orderbook = await upgrades.deployProxy(Orderbook, [resolver.address]);
    const executionManager = await upgrades.deployProxy(ExecutionManager, [resolver.address]);
    const royaltyManager = await upgrades.deployProxy(RoyaltyManager, [resolver.address]);

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
    const exchange = await upgrades.deployProxy(Exchange, [royaltyManager.address, orderbook.address, executionManager.address]);
    
    // set ownership of managers to exchange contract
    await royaltyManager.transferOwnership(exchange.address);
    await orderbook.transferOwnership(exchange.address);
    await executionManager.transferOwnership(exchange.address);
    
    // Add RAWR token as a supported payment option
    await exchange.addSupportedToken(rawrAddress);

    console.log("Exchange deployed to:", exchange.address);
    console.log("\n");

    console.log("Deploying Staking Contracts");
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await upgrades.deployProxy(Staking, [rawrAddress, resolver.address]);
    await feesEscrow.registerManager(staking.address);
    console.log("Staking deployed to:", staking.address);
    console.log("\n");

    // Content Contracts
    console.log("Deploying Content Contracts");
    
    const AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    const ContentStorage = await ethers.getContractFactory("ContentStorage");
    const Content = await ethers.getContractFactory("Content");
    const ContentManager = await ethers.getContractFactory("ContentManager");
    const ContentFactory = await ethers.getContractFactory("ContentFactory");

    // Deploy Implementation contracts
    const accessControlManagerImpl = await AccessControlManager.deploy();
    const contentImpl = await Content.deploy();
    const contentStorageImpl = await ContentStorage.deploy();
    const contentManagerImpl = await ContentManager.deploy();

    // Initialize Content Clone Factory
    const contentFactory = await upgrades.deployProxy(ContentFactory, [contentImpl.address, contentManagerImpl.address, contentStorageImpl.address, accessControlManagerImpl.address]);

    console.log("ContentFactory deployed to:", contentFactory.address);
    console.log("\n");

    // setting up resolver addresses
    // register the exchange contracts on the address resolver
    addresses = [
        exchange.address,
        staking.address,
        contentFactory.address,
        rawrAddress
    ];

    escrowIds = [
        "0xeef64103",
        "0x1b48faca",
        "0xdb337f7d",
        "0x3d13c043"
    ];
    await resolver.registerAddress(escrowIds, addresses);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

// Optimistic Kovan Addresses
// RAWR Token deployed to: 0xdf973861836d3c5bf77e69f6ccab174445aa8363
// AddressResolver deployed to: 0xdE156176f1f20FF7485FE2bFE84c64541A8639D1
// Exchange deployed to: 0x36084B5E07B5A1Fa0Cb233C38E573c7C0653e6F4
// Staking deployed to: 0x445497C91DC542bBCcCC9b27dE3caFc32E861780
// ContentFactory deployed to: 0x2385547DAd794d7cddc46ecF9ab8CCa803981FAf