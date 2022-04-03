const { ethers, upgrades } = require("hardhat");

var Collection;
var CollectionManager;

async function deployContract(factory, developer, rate, uri) {

    var tx = await factory.connect(developer).createContracts(developer.address, rate, uri);
    var receipt = await tx.wait();
    var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

    // To figure out which log contains the ContractDeployed event
    var collection = await Collection.attach(deployedContracts[0].args.collection);
    var collectionManager = await CollectionManager.attach(deployedContracts[0].args.collectionManager);

    var approvalPair = [[developer.address, true]];
    await collectionManager.connect(developer).registerOperators(approvalPair);

    return {collection, collectionManager};
}

async function addRawrshakAssets(collection, collectionManager, developer) {
    var asset = [
        ["QmTgLKGxFapNAaKSoaXZkx3vq9xiarfag3cjcByUywzf7h", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        ["QmX1Epc144wovBa3i8LVy6JoVxUpVjuA7nQvDmigo8NAx7", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        ["QmaCGZKewUkJCw7nHtvMCTxxeeg1fNhF1BGKVowAAh5dJn", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        ["QmeZ9t91M5AizHBwPHt7ZYEzvhS9ic98eQ8BUQ7bZrERBT", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        ["QmUcUdn8Gf9hiwqvmN9SzP4JZsrC72CpPLptXwjyW8Nuv3", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        ["QmWGDc6HM4oXXmhkDYKLcL95anW5Wsxmw6daUrc2KL82fa", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await collectionManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await collection.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(collection, collectionManager, developer) {
    var asset = [
        ["QmPdzEWnW1PAxm4LFe5pRw3g5kNee8oKKtbs92sVekMce4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        ["QmPC6iFFc1ewqVCcfPyyG4YssL6zwX9DW2VQDD5K6P3PLD", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        ["QmXVeyvvDhknXuH2CevPUGxjDFXDPRTxS7k6Ehm7jRVSHH", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        ["QmVqWJPhcchCSp22FQSxxzRZMFVpae2fMSa3sPbmHywXCC", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        ["QmbTvdvL2CUPpBVf7LvFb25t2JdqqGjumed5bVaSpyCZYx", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        ["QmWroKamTeD2hr66ERDGXG7axLzagK2p48BBuBwjN7TFrF", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        ["QmaUz6wBvxTFJBdcJRy59nMPNm78CKMjwuqYgfvGBUwZ52", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        ["QmNbQxN82JweyESPP9tCVMroVA1itf974pLknMjkt3Eo2k", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        ["QmSPTeM11qMLKWMtqrvPDV1FxEDEkjQ5HZjJmQfkGq4DZt", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await collectionManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await collection.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(collection, collectionManager, developer) {
    var asset = [
        ["QmPFJoS7UKXmmXeA4HMes1K5GRNM2QQ94hf6dSUqH3i2wF", "", 1000, developer.address, 10000],         // Nikolai
        ["Qma3cwsq1kqcAP6zudnr1WyWWkXhVnYa1wgRAun8op9nGa", "", 1000, developer.address, 20000],         // Didier
        ["Qma7QXrm9wUFmdxBWT32fWccfQ6kvNeZS598eMdVuBvthU", "", 500, ethers.constants.AddressZero, 0],   // Josip
        ["QmRde9qaDmyDrxEpHPC5ycnt36S375WUaBpSrDuemE68Vn", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await collectionManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await collection.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(collection, collectionManager, developer) {
    var asset = [
        ["QmXnMAmDwKuMsmWLc6dnccwaGqLMXyGHBjEvC9oHePNvFX", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        ["QmfMoQt1LGs7PN5UYP2kikkuYpHJiFHGx2EHCPaEuLZ7Kt", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        ["QmRpA8dRsLhzwGifk2yV4fcTJpAP89s3Mmm5X1qqH5Xwza", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        ["QmZMpYizqKeSVFtQrWWYSmPK93yWHJgFsvFYZuKaQz8QXn", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
    ];

    // add assets
    await collectionManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [1000,50,50,25], 0, ethers.constants.AddressZero, []];
    await collection.connect(developer).mintBatch(mintData);
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
  
    var balance = await deployer.getBalance();
    console.log(`Account Balance: ${balance.toString()}\n`);

    // Get Collection Contract Factory 
    Collection = await ethers.getContractFactory("Collection");
    CollectionManager = await ethers.getContractFactory("CollectionManager");
    const CollectionFactory = await ethers.getContractFactory("CollectionFactory");
    const factory = CollectionFactory.attach("0xf5059a5D33d5853360D16C683c16e67980206f36");

    // Note: for the URI, the developer has to add "https://ipfs.io/ipfs/" before downloading from ipfs
    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, dev1, 10000, "QmQigPDu4wChRtrdgnbCFJFuYHD55sioFztdu1r9bME46o");
    console.log(`Rawrshak Contracts: Collection[ ${addresses.collection.address} ], CollectionManager[ ${addresses.collectionManager.address} ]\n`);
    await addRawrshakAssets(addresses.collection, addresses.collectionManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "QmP3Hnw72H4w7s4XEEa12vHAa7EYXSCGEd2KPcScrMvx9z");
    console.log(`ScreamFortress2 Contracts: Collection[ ${addresses.collection.address} ], CollectionManager[ ${addresses.collectionManager.address} ]\n`);
    await addScreamFortress2Assets(addresses.collection, addresses.collectionManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "QmSkixBkwkEoMzEVcWsDxaYxVhEJDiatPjAEvHaJY383Ks");
    console.log(`FightBuddy Contracts: Collection[ ${addresses.collection.address} ], CollectionManager[ ${addresses.collectionManager.address} ]\n`);
    await addFightBuddyAssets(addresses.collection, addresses.collectionManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "QmY1cxbALonbMiSTWnnQooCJqKDcAMs69nqhmBP8jSyQP8");
    console.log(`SuperScaryHorrorGame Contracts: Collection[ ${addresses.collection.address} ], CollectionManager[ ${addresses.collectionManager.address} ]\n`);
    await addSuperScaryHorrorGameAssets(addresses.collection, addresses.collectionManager, dev3);

    balance = await deployer.getBalance();
    balance = web3.utils.fromWei(balance.toString(), 'ether');
    console.log(`Account Balance: ${balance.toString()}`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });