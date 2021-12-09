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

async function addDemoAssets(content, contentManager, developer) {
    var asset = [
        [0, "Qmdd17X4K3THc8YrneCdY7tHksEMqmHf9R66C1EtUEuqE4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Audio 1
        [1, "QmQPGYRYhu2yhKAt2Ud6HDHjPGcKAzzYeqj83LpJx8BVN7", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Audio 2
        [2, "QmdERCqdG7TQHgzskFnciizNCpmQu1VGH8MZAPNQcmo2VK", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Text 1
        [3, "QmQKZNHq4ufJfvGxQeu3WwfQQCEooSfkDjmHPWKzeC71dP", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Image 1
        [4, "QmUvaVYnUzPcnDh61XettLDeCbDbMckA7VEsxQD3JAMirL", "", ethers.constants.MaxUint256, developer.address, 20000],          // Image 2
        [5, "QmcYk3hn7ipSppYihWu2FJkvW5kgWXeTWvuDnhJQviB9m1", "", ethers.constants.MaxUint256, developer.address, 20000]           // Static 1
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [5,5,5,5,10,2], 0, ethers.constants.AddressZero, []];
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
        player4,
        devDemo,
        playerDemo
    ] = await ethers.getSigners();

    console.log(`Deploying contracts with the account: ${devDemo.address}`);
  
    var balance = await devDemo.getBalance();
    console.log(`Account Balance: ${balance.toString()}\n`);

    // Get Content Contract Factory 
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    const ContentFactory = await ethers.getContractFactory("ContentFactory");
    const factory = ContentFactory.attach("0xbe479c85e81B34BcA13F613DfF4f3F9D9eC6d715");

    // Note: for the URI, the developer has to add "https://ipfs.io/ipfs/" before downloading from ipfs
    // Developer 1 Rawrshak and Scream Fortress 2 Contract
    var addresses = await deployContract(factory, devDemo, 10000, "QmWLvdLBePX45eeamK79heSidGuV2z6merKM38dzwVRQs3");
    console.log(`Rawrshak Demo Day Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]\n`);
    
    console.log("Adding Demo Assets");
    await addDemoAssets(addresses.content, addresses.contentManager, devDemo);

    // Send Assets to Demo Wallet
    console.log("Sending Demo assets to Demo Player");
    await content.connect(devDemo).safeBatchTransferFrom(devDemo.address, playerDemo.address, [0, 1, 2, 3, 4, 5], [1, 1, 1, 1, 1, 1], []);


    balance = await devDemo.getBalance();
    balance = web3.utils.fromWei(balance.toString(), 'ether');
    console.log(`Remaining Account Balance: ${balance.toString()}`);

  }
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });


// // Optimism Kovan Contracts
// Rawrshak Contracts: Content[ 0x1dc68bB2Cd758160953Cf166f6D060aA17EA9697 ], ContentManager[ 0x37c0672d200B95F072Fd10598327B52ab3bC343a