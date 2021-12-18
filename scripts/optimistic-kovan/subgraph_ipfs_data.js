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
        ["QmNaxBen5gBMLMi944tChJidrak8L5ZscUjmg5GF1M1H9x", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        ["QmXNJccAKXhH9skRajE5jx6tpfMHqzhYXnuxH4j7LkAhVk", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        ["QmZ3YGRe3xRDVn6jf4Vx9usLdNkd8sPKqUuBUtWAEMoKfA", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        ["QmXDmHoijMKzGAoLEytgncQUCigrTWsRjeMUXvkdy5DrYs", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        ["QmdTES2ZbdcEr4nWqEUqVGnEkm8N5yDqfBoRtmCpEVVGPT", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        ["QmSfQtVpzmrKsxxPok8dGVzYMEN6hg3k9JevCLxVBnGdu4", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        ["QmQwS6y19S31ffzhzyRDESvBfgFNczKzU7fGc4e8Pexqja", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        ["QmWTGqXv8anJBbQ4PMnixEn6UxTVh1kPSKE1N32MMcthJR", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        ["QmU299Sj8Pdu2TZbvfPHRMQ3jECtfn6d4ij4a6FseeCPSQ", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        ["QmPJixpZMSXtSfmGD4BQGAvh6cpoYB5JDfLkXyMnMy5yn6", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        ["QmQzzjAeGgjhRwRvQj35m85QPDNLgi7NPWKRvydSEzu7T2", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        ["QmfHqXE8ugthD4DtbdJpd7tNovP9Gw3QpkYt3rWcfsjFW6", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        ["QmRmA5TM9yfue3nSkqq8AguGUraiy8eA38xb7CRCbdj8mn", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        ["QmesGcGFbASfNwuaF7nYtKjcvpCfRswvC6FcuqQA6UZLDv", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        ["QmUUMejnjWRp1sE47mt9VDiUuxTV7Zf5VPfR1m1LPGizLG", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        ["QmcLLgGc8FsDBc7C4Kpctc36CbAgpPtt4SzodKHXurzsFo", "", 1000, developer.address, 10000],         // Nikolai
        ["QmVbnJ4D9753hLSFjxL6b5742EtFWSkGVsmazNDjKHS4GZ", "", 1000, developer.address, 20000],         // Didier
        ["QmVuurqFHU6CTgZsTKBeHkXNbPUENnP4tomk3gT9Geuf2m", "", 500, ethers.constants.AddressZero, 0],   // Josip
        ["QmTgSQooZLebGgq53XwwMbUvwkDjTMdt1XhKVuyN1zWg1m", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        ["QmQQnG8VKwaPCjhPT4jNWQ837BGvTtbFwjaZ9A9hhFigGj", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        ["QmZ4qX68qpc7GSu9RQp52MwCmwWF8g7kKpgh5DSEEcHJT1", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        ["QmYzK48VvLvdxNhbk8vGz9XsbBdufRYDgqcZvfMRafDMgj", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        ["QmRyL3BycWsSKgoDz9Cq3sawnq5A4m6towY4dMV8ENkQcC", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
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
    const factory = ContentFactory.attach("0xbe479c85e81B34BcA13F613DfF4f3F9D9eC6d715");

    // Note: for the URI, the developer has to add "https://ipfs.io/ipfs/" before downloading from ipfs
    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, dev1, 10000, "QmUdkSH5xeSXu1aqSL6nHd7nDude2JagZzAGSHJg4eTaWZ");
    console.log(`Rawrshak Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addRawrshakAssets(addresses.content, addresses.contentManager, dev1);

    var addresses = await deployContract(factory, dev1, 10000, "QmP3yu5W6hBcoNNSdbvShPec2QmWcG2wMMLo7BH4jz1hTx");
    console.log(`ScreamFortress2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addScreamFortress2Assets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "Qmdz9Y8zEfD7Wr69y4YY3rqLvRC2JRvdgacjjYxVMbfsrX");
    console.log(`FightBuddy Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    await addFightBuddyAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "QmYBZAEBjSJAJhqKcSUT7ZLjamp5k8VG8kLoja6dXgwadM");
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
// Rawrshak Contracts: Content[ 0xc9EBafF8237740353E0dEd89130fB83be4bd3F90 ], ContentManager[ 0x79058587a4D5f2b705C9B315ADd23c56A6607508 ]
// ScreamFortress2 Contracts: Content[ 0x393d8E12Aa7F22f8999bf9DDAc6842Db2bb6F096 ], ContentManager[ 0x579e73C522b8Dca7007a341D06E6B2394C23644c ]
// FightBuddy Contracts: Content[ 0x8896fD674aE91340570129BB9391F533ec2e9aa4 ], ContentManager[ 0xadeB62FCC2BB7979DC7848968f46E30eFe62d8F8 ]
// SuperScaryHorrorGame Contracts: Content[ 0x2bf2685c0Cf29FF00bDFc66041fE8efA1bcf5D7F ], ContentManager[ 0x0a821abfb0c5c9db497d5d0468D10e7c17e8BfF5 ]