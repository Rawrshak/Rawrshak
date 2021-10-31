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
        [0, "QmNaxBen5gBMLMi944tChJidrak8L5ZscUjmg5GF1M1H9x", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Apprentice Title
        [1, "QmXNJccAKXhH9skRajE5jx6tpfMHqzhYXnuxH4j7LkAhVk", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Creator Title
        [2, "QmZ3YGRe3xRDVn6jf4Vx9usLdNkd8sPKqUuBUtWAEMoKfA", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Gamer Pesant Title
        [3, "QmXDmHoijMKzGAoLEytgncQUCigrTWsRjeMUXvkdy5DrYs", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Disciple Title
        [4, "QmdTES2ZbdcEr4nWqEUqVGnEkm8N5yDqfBoRtmCpEVVGPT", "", ethers.constants.MaxUint256, developer.address, 20000],          // Lord Title
        [5, "QmSfQtVpzmrKsxxPok8dGVzYMEN6hg3k9JevCLxVBnGdu4", "", ethers.constants.MaxUint256, developer.address, 20000]           // Original Sinner Title
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addScreamFortress2Assets(content, contentManager, developer) {
    var asset = [
        [0, "QmQwS6y19S31ffzhzyRDESvBfgFNczKzU7fGc4e8Pexqja", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Demoman
        [1, "QmWTGqXv8anJBbQ4PMnixEn6UxTVh1kPSKE1N32MMcthJR", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Engineer
        [2, "QmU299Sj8Pdu2TZbvfPHRMQ3jECtfn6d4ij4a6FseeCPSQ", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Heavy
        [3, "QmPJixpZMSXtSfmGD4BQGAvh6cpoYB5JDfLkXyMnMy5yn6", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Medic
        [4, "QmQzzjAeGgjhRwRvQj35m85QPDNLgi7NPWKRvydSEzu7T2", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Pyro
        [5, "QmfHqXE8ugthD4DtbdJpd7tNovP9Gw3QpkYt3rWcfsjFW6", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Scout
        [6, "QmRmA5TM9yfue3nSkqq8AguGUraiy8eA38xb7CRCbdj8mn", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Sniper
        [7, "QmesGcGFbASfNwuaF7nYtKjcvpCfRswvC6FcuqQA6UZLDv", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Soldier
        [8, "QmUUMejnjWRp1sE47mt9VDiUuxTV7Zf5VPfR1m1LPGizLG", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]    // Spy
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5,6,7,8], [100,100,100,100,100,100,100,100,100], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addFightBuddyAssets(content, contentManager, developer) {
    var asset = [
        [0, "QmcLLgGc8FsDBc7C4Kpctc36CbAgpPtt4SzodKHXurzsFo", "", 1000, developer.address, 10000],         // Nikolai
        [1, "QmVbnJ4D9753hLSFjxL6b5742EtFWSkGVsmazNDjKHS4GZ", "", 1000, developer.address, 20000],         // Didier
        [2, "QmVuurqFHU6CTgZsTKBeHkXNbPUENnP4tomk3gT9Geuf2m", "", 500, ethers.constants.AddressZero, 0],   // Josip
        [3, "QmTgSQooZLebGgq53XwwMbUvwkDjTMdt1XhKVuyN1zWg1m", "", 50, developer.address, 30000]            // Glenn
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3], [100,100,100,10], 0, ethers.constants.AddressZero, []];
    await content.connect(developer).mintBatch(mintData);
}

async function addSuperScaryHorrorGameAssets(content, contentManager, developer) {
    var asset = [
        [0, "QmQQnG8VKwaPCjhPT4jNWQ837BGvTtbFwjaZ9A9hhFigGj", "", 10000, ethers.constants.AddressZero, 0], // Scary Terry
        [1, "QmZ4qX68qpc7GSu9RQp52MwCmwWF8g7kKpgh5DSEEcHJT1", "", 50, ethers.constants.AddressZero, 0],    // Casper the Ghost
        [2, "QmYzK48VvLvdxNhbk8vGz9XsbBdufRYDgqcZvfMRafDMgj", "", 50, ethers.constants.AddressZero, 0],    // Screamer
        [3, "QmRyL3BycWsSKgoDz9Cq3sawnq5A4m6towY4dMV8ENkQcC", "", 25, ethers.constants.AddressZero, 0]     // Headless Canadian
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
    const factory = ContentFactory.attach("0xf5059a5D33d5853360D16C683c16e67980206f36");

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

// // Optimism Local Contracts
// Rawrshak Contracts: Content[ 0xC5999Ef9Fe837eDB1fE6611983fb1Bf8ceB477d4 ], ContentManager[ 0xA4C8495ba6243F718Aa01cE75Dbd0b63EFCe6f71 ]
// ScreamFortress2 Contracts: Content[ 0xF4166C399b38A705B9edE285d2F2E76fF6d70468 ], ContentManager[ 0x52186FC20812e479d48bE61481fB26fF73Ed275f ]    
// FightBuddy Contracts: Content[ 0x0FeeC7150b5a6C9653F18dc646718d0d5d02C244 ], ContentManager[ 0x3422d9927Dc5433f6874b3D32C297e636Dc388dE ]    
// SuperScaryHorrorGame Contracts: Content[ 0xD40eeC93b5E823Cc17C6930eD248D96f6F869105 ], ContentManager[ 0x77297Eb9d9405a73d7fDab73af10B1e6ceE6Fd18 ]

// // Contracts
// Rawrshak Contracts: Content[ 0x55652FF92Dc17a21AD6810Cce2F4703fa2339CAE ], ContentManager[ 0x6DDFF2dF38D87DC8CCDfCFCDFDb3608bc296eD60 ]
// ScreamFortress2 Contracts: Content[ 0x79E4D62d828379720db8E0E9511e10e6Bac05351 ], ContentManager[ 0x29d06C5C563607DBB712aC75780Ba0eACB0B0cf1 ]
// FightBuddy Contracts: Content[ 0x0c9D7DEbA226e5743f5DA3bB398Bf6B1611Cbc51 ], ContentManager[ 0x7AE28c8398b47ef70eB7004392E337885d1c2de0 ]
// SuperScaryHorrorGame Contracts: Content[ 0xce67A98AbDbCa375B649c2BE30cFE24AFdA32b48 ], ContentManager[ 0x3A3021e237D11Bd9a60973Ba94e8c8d6FFC6d1aE ]