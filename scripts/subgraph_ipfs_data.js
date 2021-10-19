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
        [0, "QmTgLKGxFapNAaKSoaXZkx3vq9xiarfag3cjcByUywzf7h", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        [1, "QmX1Epc144wovBa3i8LVy6JoVxUpVjuA7nQvDmigo8NAx7", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        [2, "QmaCGZKewUkJCw7nHtvMCTxxeeg1fNhF1BGKVowAAh5dJn", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        [3, "QmeZ9t91M5AizHBwPHt7ZYEzvhS9ic98eQ8BUQ7bZrERBT", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        [4, "QmUcUdn8Gf9hiwqvmN9SzP4JZsrC72CpPLptXwjyW8Nuv3", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        [5, "QmWGDc6HM4oXXmhkDYKLcL95anW5Wsxmw6daUrc2KL82fa", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        [0, "QmPdzEWnW1PAxm4LFe5pRw3g5kNee8oKKtbs92sVekMce4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        [1, "QmPC6iFFc1ewqVCcfPyyG4YssL6zwX9DW2VQDD5K6P3PLD", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        [2, "QmXVeyvvDhknXuH2CevPUGxjDFXDPRTxS7k6Ehm7jRVSHH", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        [3, "QmVqWJPhcchCSp22FQSxxzRZMFVpae2fMSa3sPbmHywXCC", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        [4, "QmbTvdvL2CUPpBVf7LvFb25t2JdqqGjumed5bVaSpyCZYx", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        [5, "QmWroKamTeD2hr66ERDGXG7axLzagK2p48BBuBwjN7TFrF", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        [6, "QmaUz6wBvxTFJBdcJRy59nMPNm78CKMjwuqYgfvGBUwZ52", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        [7, "QmNbQxN82JweyESPP9tCVMroVA1itf974pLknMjkt3Eo2k", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        [8, "QmSPTeM11qMLKWMtqrvPDV1FxEDEkjQ5HZjJmQfkGq4DZt", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        [0, "QmPFJoS7UKXmmXeA4HMes1K5GRNM2QQ94hf6dSUqH3i2wF", "", 1000, developer.address, 10000],         // Nikolai
        [1, "Qma3cwsq1kqcAP6zudnr1WyWWkXhVnYa1wgRAun8op9nGa", "", 1000, developer.address, 20000],         // Didier
        [2, "Qma7QXrm9wUFmdxBWT32fWccfQ6kvNeZS598eMdVuBvthU", "", 500, ethers.constants.AddressZero, 0],   // Josip
        [3, "QmRde9qaDmyDrxEpHPC5ycnt36S375WUaBpSrDuemE68Vn", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        [0, "QmXnMAmDwKuMsmWLc6dnccwaGqLMXyGHBjEvC9oHePNvFX", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        [1, "QmfMoQt1LGs7PN5UYP2kikkuYpHJiFHGx2EHCPaEuLZ7Kt", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        [2, "QmRpA8dRsLhzwGifk2yV4fcTJpAP89s3Mmm5X1qqH5Xwza", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        [3, "QmZMpYizqKeSVFtQrWWYSmPK93yWHJgFsvFYZuKaQz8QXn", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
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
  
    var balance = await deployer.getBalance();
    console.log(`Account Balance: ${balance.toString()}\n`);

    // Get Content Contract Factory 
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    const ContentFactory = await ethers.getContractFactory("ContentFactory");
    const factory = ContentFactory.attach("0xFD471836031dc5108809D173A067e8486B9047A3");

    // Note: for the URI, the developer has to add "https://ipfs.io/ipfs/" before downloading from ipfs
    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, dev1, 10000, "QmQigPDu4wChRtrdgnbCFJFuYHD55sioFztdu1r9bME46o");
    console.log(`Rawrshak Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addRawrshakAssets(addresses.content, addresses.contentManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "QmP3Hnw72H4w7s4XEEa12vHAa7EYXSCGEd2KPcScrMvx9z");
    console.log(`ScreamFortress2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addScreamFortress2Assets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "QmSkixBkwkEoMzEVcWsDxaYxVhEJDiatPjAEvHaJY383Ks");
    console.log(`FightBuddy Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addFightBuddyAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "QmY1cxbALonbMiSTWnnQooCJqKDcAMs69nqhmBP8jSyQP8");
    console.log(`SuperScaryHorrorGame Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addSuperScaryHorrorGameAssets(addresses.content, addresses.contentManager, dev3);

    balance = await deployer.getBalance();
    balance = web3.utils.fromWei(balance.toString(), 'ether');
    console.log(`Account Balance: ${balance.toString()}`);
    
    // Rawrshak Contracts: Content[ 0x3063527AEE58c9470AD00E31e4fc6A613b84a8b1 ], ContentManager[ 0xcfbe2694e9c033Cc6adbA084E51b6AfECfed09b7 ]
    // ScreamFortress2 Contracts: Content[ 0x1216517D85581CC2901dC5d214f20b910910774f ], ContentManager[ 0xEEe51B3236219931DD0fdDc712c6cf9bA55bd110 ]
    // FightBuddy Contracts: Content[ 0x7e5DC850470672b81b119cCFfEF595DFb6060cC7 ], ContentManager[ 0x0E89b24e46A7F30f018225b75A24b5cb000EBaE7 ]
    // SuperScaryHorrorGame Contracts: Content[ 0x7d046EEA32043D36Fe6De42568A5EB0FAD946117 ], ContentManager[ 0x84206ECC24BC547276c59B40b04F63bd70CBFC7c ]
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });