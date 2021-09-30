const { ethers, upgrades } = require("hardhat");

var Content;
var ContentManager;

async function deployContract(factory, developer, rate, uri) {

    var tx = await factory.connect(developer).createContracts(developer.address, rate, uri);
    var receipt = await tx.wait();
    var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

    // To figure out which log contains the ContractDeployed event
    var content = await Content.attach(deployedContracts[0].args.content);
    var contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

    var approvalPair = [[developer.address, true]];
    await contentManager.connect(developer).registerOperators(approvalPair);

    return {content, contentManager};
}

async function addRawrshakAssets(content, contentManager, developer) {
    var asset = [
        [0, "arweave.net/tx/public-uri-1", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        [1, "arweave.net/tx/public-uri-2", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        [2, "arweave.net/tx/public-uri-3", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        [3, "arweave.net/tx/public-uri-4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        [4, "arweave.net/tx/public-uri-5", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        [5, "arweave.net/tx/public-uri-6", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        [0, "arweave.net/tx/public-uri-1", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        [1, "arweave.net/tx/public-uri-2", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        [2, "arweave.net/tx/public-uri-3", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        [3, "arweave.net/tx/public-uri-4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        [4, "arweave.net/tx/public-uri-5", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        [5, "arweave.net/tx/public-uri-6", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        [6, "arweave.net/tx/public-uri-7", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        [7, "arweave.net/tx/public-uri-8", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        [8, "arweave.net/tx/public-uri-9", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        [0, "arweave.net/tx/public-uri-1", "", 1000, developer.address, 10000],         // Nikolai
        [1, "arweave.net/tx/public-uri-2", "", 1000, developer.address, 20000],         // Didier
        [2, "arweave.net/tx/public-uri-3", "", 500, ethers.constants.AddressZero, 0],   // Josip
        [3, "arweave.net/tx/public-uri-4", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        [0, "arweave.net/tx/public-uri-1", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        [1, "arweave.net/tx/public-uri-2", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        [2, "arweave.net/tx/public-uri-3", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        [3, "arweave.net/tx/public-uri-4", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [1000,50,50,25], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function main() {
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    const [
        deployer,
        dev1,
        dev2,
        dev3,
        player1,
        player2,
        player3,
        player4
    ] = await ethers.getSigners();

    console.log(`Deploying contracts with the account: ${deployer.address}`);
  
    const balance = await deployer.getBalance();
    console.log(`Account Balance: ${balance.toString()}`);

    // Get Content Contract Factory 
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    const ContentFactory = await ethers.getContractFactory("ContentFactory");
    const factory = ContentFactory.attach("0x851356ae760d987E095750cCeb3bC6014560891C");

    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");

    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, dev1, 10000, "arweave.net/dev1-contract-uri");
    console.log(`Dev1 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addRawrshakAssets(addresses.content, addresses.contentManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "arweave.net/dev1-contract-uri");
    console.log(`Dev1 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addScreamFortress2Assets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "arweave.net/dev2-contract-uri");
    console.log(`Dev2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addFightBuddyAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "arweave.net/dev3-contract-uri");
    console.log(`Dev3 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addSuperScaryHorrorGameAssets(addresses.content, addresses.contentManager, dev3);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });