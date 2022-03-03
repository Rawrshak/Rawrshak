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

    // Collection Contracts
    console.log("Deploying Collection Contracts");
    
    AccessControlManager = await ethers.getContractFactory("AccessControlManager");
    CollectionStorage = await ethers.getContractFactory("CollectionStorage");
    Collection = await ethers.getContractFactory("Collection");
    CollectionManager = await ethers.getContractFactory("CollectionManager");
    CollectionFactory = await ethers.getContractFactory("CollectionFactory");

    // Deploy Implementation contracts
    accessControlManagerImpl = await AccessControlManager.deploy();
    collectionImpl = await Collection.deploy();
    collectionStorageImpl = await CollectionStorage.deploy();
    collectionManagerImpl = await CollectionManager.deploy();

    // Initialize Collection Clone Factory
    collectionFactory = await upgrades.deployProxy(CollectionFactory, [collectionImpl.address, collectionManagerImpl.address, collectionStorageImpl.address, accessControlManagerImpl.address]);

    console.log("CollectionFactory deployed to:", collectionFactory.address);
    console.log("\n");

    // setting up resolver addresses
    var addresses = [
        staking.address,
        collectionFactory.address,
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