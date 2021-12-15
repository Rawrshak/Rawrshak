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
        ["https://arweave.net/oYnTrb5bUIm1lgbTpBFZ9LLPVeDpDxb_vW1XBNfzlgI", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        ["https://arweave.net/GFVxBPSj-bSQ_bi5ZIaxJV1fKm63pI0Dcc_qwMZIvg0", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        ["https://arweave.net/y2b16LSQOqmjUeckSCltiH4_8XP3GVZVgps0N6eG6HI", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        ["https://arweave.net/pIXtTejDqULTO16tOhcA5goEoeC8kMufmxZrpUkAZPA", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        ["https://arweave.net/BT067qgPxUoMQOogSvxPRIwwIwv-eKf7xb-rzeRWvSU", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        ["https://arweave.net/pOiwYzVm9_VVuVtdWqgaw57A1A9c3vdxeNG9d3cgZuM", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        ["https://arweave.net/Rg_ldKekDpRydL52p0EQeG7LnCHAzd6_ehE59omkl38", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        ["https://arweave.net/Z90dMMhDYK5d9vP0LDMdDDd4lnwEXCwJjHcbXfdIySw", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        ["https://arweave.net/xSQgeZmVwzQjWfad6AfrIWXPcvivMXXFa_GaynnvliY", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        ["https://arweave.net/QOu6LWgWwoOpSfKJC21Zc8HgRKdpamMLpgRciWLzcQw", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        ["https://arweave.net/uJxDoYDITlNAH14tXIOP8he_AuGHZ5ZHW_XL342Laj0", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        ["https://arweave.net/TmSZJve-3-Ckpa-zlWgksIT2A-dqDxdnxdUBitxB1Lw", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        ["https://arweave.net/W3h0XvASvmYZfuX6JV1s2AHEoAbTXxSpEarjFLi65Nc", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        ["https://arweave.net/OFpQMdO9D9VNh0CYg3lfJNtOT_l3XpTAFq19-saDkJU", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        ["https://arweave.net/NS-yuTTqq_wCY5wVwdSv_cipRM5GgUirL8rN4jesDfg", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        ["https://arweave.net/cg2N77GOOcKriioxIwEeeW3mU-a4XlTa6GOt1BQixIE", "", 1000, developer.address, 10000],         // Nikolai
        ["https://arweave.net/ULuMJ7q_8uomd-tG2FWb-n2ZnlX_4deteFGzsv1MzkY", "", 1000, developer.address, 20000],         // Didier
        ["https://arweave.net/qT_Se_bUb-HVE3JIOVzNFLgKc3m0t5hmEhml7X1WWLg", "", 500, ethers.constants.AddressZero, 0],   // Josip
        ["https://arweave.net/tWfM7C5a-mC1Q6mU76Ik62iE3jYsl9QrB9mgvTAwsm8", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        ["https://arweave.net/lfLN2kypyClSFDXV_UbcDAr-IkNUNTHykCVx2uZueCg", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        ["https://arweave.net/CtIZH6MptmKwZJ0h1QgRYZ3LxTmYRn52dHOkdn5OQyc", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        ["https://arweave.net/62GxTC26d3ZuD67hXHWFSCbyIfgw6bRIkavumyRGt9M", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        ["https://arweave.net/dCI3wOGGNXQb_WzwsNik7gzKQ5YDZFp_Q_Fqvw0aYI8", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
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
    var addresses = await deployContract(factory, dev1, 10000, "https://arweave.net/9OH9jjpxKVbnC2fTCRIGbXksfCQZmP-97y8WYvda_7s");
    console.log(`Rawrshak Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addRawrshakAssets(addresses.content, addresses.contentManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "https://arweave.net/-44J5IsiKnuVBMBWEY4Mo6rGRqBLdQQ62EucPqImqFc");
    console.log(`ScreamFortress2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addScreamFortress2Assets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "https://arweave.net/sFQn2f3S5NcOqzYr2K8UxHMjPlbNryKxBavgKWuyNOA");
    console.log(`FightBuddy Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addFightBuddyAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "https://arweave.net/PutfqWQZn-aj3RRC87KafDBLQ-_Mk6czi8KBIIVbchA");
    console.log(`SuperScaryHorrorGame Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addSuperScaryHorrorGameAssets(addresses.content, addresses.contentManager, dev3);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });