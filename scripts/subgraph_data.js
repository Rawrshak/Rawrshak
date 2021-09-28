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

async function addAssets(content, contentManager, developer) {
    var asset = [
        [0, "arweave.net/tx/public-uri-1", "", ethers.constants.MaxUint256, developer.address, 10000],
        [1, "arweave.net/tx/public-uri-2", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],
        [2, "arweave.net/tx/public-uri-3", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],
        [3, "arweave.net/tx/public-uri-4", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],
        [4, "arweave.net/tx/public-uri-5", "", 100, developer.address, 20000],
        [5, "arweave.net/tx/public-uri-6", "", 10, developer.address, 50000]
    ];

    // add assets
    await contentManager.connect(developer).addAssetBatch(asset);
    
    // mint some assets
    var mintData = [developer.address, [0,1,2,3,4,5], [100,100,100,100,10,2], 0, ethers.constants.AddressZero, []];
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

    // Get Rawr token stuff
    const RawrToken = await ethers.getContractFactory("RawrToken");
    const rawr = RawrToken.attach("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");

    const rawrBalance = web3.utils.fromWei((await rawr.balanceOf(deployer.address)).toString(), 'ether');
    console.log(`Deployer RAWR balance: ${rawrBalance.toString()}`);

    // await rawr.transfer(player1.address, web3.utils.toWei('10000', 'ether'));
    // await rawr.transfer(player2.address, web3.utils.toWei('10000', 'ether'));
    // await rawr.transfer(player3.address, web3.utils.toWei('10000', 'ether'));    
    // await rawr.transfer(player4.address, web3.utils.toWei('10000', 'ether'));

    // Get Content Contract Factory 
    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");
    const ContentFactory = await ethers.getContractFactory("ContentFactory");
    const factory = ContentFactory.attach("0x851356ae760d987E095750cCeb3bC6014560891C");

    Content = await ethers.getContractFactory("Content");
    ContentManager = await ethers.getContractFactory("ContentManager");

    // Developer 1 Deploys A Contract
    var addresses = await deployContract(factory, dev1, 10000, "arweave.net/dev1-contract-uri");
    console.log(`Dev1 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addAssets(addresses.content, addresses.contentManager, dev1);
    
    // Developer 2 Deploys A Contract
    addresses = await deployContract(factory, dev2, 20000, "arweave.net/dev2-contract-uri");
    console.log(`Dev2 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addAssets(addresses.content, addresses.contentManager, dev2);
    
    // Developer 3 Deploys A Contract
    addresses = await deployContract(factory, dev3, 15000, "arweave.net/dev3-contract-uri");
    console.log(`Dev3 Contracts: Content[ ${addresses.content.address} ], ContentManager[ ${addresses.contentManager.address} ]`);
    await addAssets(addresses.content, addresses.contentManager, dev3);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });