const { ethers, upgrades } = require("hardhat");

async function main() {
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    const [deployer] = await ethers.getSigners();
  
    console.log("Deploying RAWR token contract");
    MockToken = await ethers.getContractFactory("MockToken");
    rawr = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
    await rawr.mint(deployer.address, ethers.BigNumber.from(100000000).mul(_1e18));
    console.log("RAWR Token deployed to:", rawr.address);
    console.log("\n");
    
    console.log("Deploying Address Resolver Contract");
    AddressResolver = await ethers.getContractFactory("AddressResolver");
    resolver = await upgrades.deployProxy(AddressResolver, []);
    console.log("AddressResolver deployed to:", resolver.address);
    console.log("\n");

    console.log("Deploying Staking Contracts");
    Staking = await ethers.getContractFactory("Staking");
    staking = await upgrades.deployProxy(Staking, [rawr.address, resolver.address]);
    // await feesEscrow.registerManager(staking.address);
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
    var addresses = [
        staking.address,
        contentFactory.address,
        rawr.address
    ];

    var escrowIds = [
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