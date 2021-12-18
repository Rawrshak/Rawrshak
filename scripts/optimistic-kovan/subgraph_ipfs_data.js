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
        ["QmNQecdZ5CkwnmCZXhaZQCHzcVofZiuDCMHUKQnDfyqZ9i", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        ["QmZpLYhd1BLFZREpKLYxxPJ1WKHjKz1H9QN71eiByXJztL", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        ["QmZZeefCU617nbnsCNvXKYrZ6n8xADM2tAtuefQPVocxPx", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        ["QmUgDTwCthUvMmq8ij9AcbB97PYFQY8HHU73QbjwLAJTvC", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        ["QmbkUs6QEZUVkQJWQhVRs3e6K8YrNURgH5TxAnRVS6CVjt", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        ["QmXSDQuyUBBNHQ5XqEfwG8eCYL2FNscUa1azb5AfetZZ87", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        ["Qmb9gJTV4scpXX1n1QiPiWoEAw77VBXX3u7nESihs1SVv9", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        ["QmNRwzCQP4xZpuySPs3osdKnXrCts4SsdyRaR5BsShCN6u", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        ["QmPcSGFyTkMQepEgguRpBQSaEsYddEbszezD2kSrmkJ6Fo", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        ["QmVq2BuYCEz5FDzMZiMBhghvUM9izotJW1a9k7TwBN93Uq", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        ["QmVdG2MkEtbKbqNFw6JrVMXMLyGJE5Utrk6jxwAK3jnQBW", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        ["Qmb76NhCKj94r7uGH1KGwzkGKk4K22AtCg6xzpf1tpF9iL", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        ["QmbKzPM8DhE6Tupu2dbo1tFe8J87pTWWd1AzuakvJJdeg5", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        ["QmTajgBSjkAce1BobV46zCReds4WcbmAj9M3yP9wcy7xEm", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        ["QmU1A8xckH9JNE7Z31mks3tXF3EmmKrzeRMMDEKgW9dhrj", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        ["QmPdtxxeUd9VZmWymbKk5JPCDu5kD8zzW1scqD8LP6Lnsg", "", 1000, developer.address, 10000],         // Nikolai
        ["QmTQWALdd4qmpmDaWbP5duGVc1ze2xtwN4ozHzucGCyyTn", "", 1000, developer.address, 20000],         // Didier
        ["QmVEjcyKWT1j7VkGKwxQPPuM8Sr2qBgLaMtzuvVSbj8HKT", "", 500, ethers.constants.AddressZero, 0],   // Josip
        ["Qmb669NH1Gh6euWXBbRD7vteF4wNRdHySPFLsbarfKLwwn", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        ["QmUoqmCgQshxtHPjeuMmQTWhJhf6PFCtzzTXzs1YSANmG7", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        ["QmcRScbPW6b1HGaZFYhMPKB3T83pn8NX76WEfGMNaSooDY", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        ["Qme3JAQurrn5Qnw8GqkMTztrdzVmEStYyVZ4TAL6znP98q", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        ["QmXFZub1zZvtw6bXHknqAeGD4MoQB4vmcckWpr6bpnvcrZ", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [1000,50,50,25], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function main() {
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
    const factory = ContentFactory.attach("0x35c18b621c5B5ccf29e3EdeC5AE0AC98B26192d3");

    // Note: for the URI, the developer has to add "https://ipfs.io/ipfs/" before downloading from ipfs
    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, dev1, 10000, "QmcMTRsv1Yt8PMoQpViids7qB2fnezzTRWXAAsDm35S3Pp");
    console.log(`Rawrshak Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addRawrshakAssets(addresses.content, addresses.contentManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "QmPNQqRcjUrQbeqbXRWGY3WcVXZx2hLCJa5W8jcQm3vRtr");
    console.log(`ScreamFortress2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addScreamFortress2Assets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "QmYoaythDfF7cv7y42rniTv6gZaT1k4REka9qjv2Np1ASa");
    console.log(`FightBuddy Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addFightBuddyAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "QmcD574XXJmBFZfHKFWJmZYVzGnZNr3auEyHMq7AiwQYqv");
    console.log(`SuperScaryHorrorGame Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addSuperScaryHorrorGameAssets(addresses.content, addresses.contentManager, dev3);

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


// // Optimism Kovan Contracts
// Rawrshak Contracts: Content[ 0x899753A7055093B1Dc32422cfFD55186a5C18198 ], ContentManager[ 0x4941DCDB7BeD6CA1F6E5A3fFAdB9f9B74736cf82 ]
// ScreamFortress2 Contracts: Content[ 0xd24d5E9EA9f55b253E08c47CfeeDD6873a88B3F5 ], ContentManager[ 0x499ad3Df0E89A42322a603f7baFD2BaDB00fe695 ]
// FightBuddy Contracts: Content[ 0x263D6c4cfBB39642f799f81c3e4475056eC72811 ], ContentManager[ 0x489FF8D093c6C44d948964A2535cfbDA53E1c87b ]
// SuperScaryHorrorGame Contracts: Content[ 0x93ad47A42c89B345925b90a96f372BEAB84E7082 ], ContentManager[ 0x9D0Fa91D3bf89F06A6E37c60c7e2140f613CF0Fd ]