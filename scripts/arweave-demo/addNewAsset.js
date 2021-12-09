const { ethers, upgrades } = require("hardhat");

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

    // Contract Manager for Arweave Demo Day contract - 0x1dc68bB2Cd758160953Cf166f6D060aA17EA9697
    const ContentManager = await ethers.getContractFactory("ContentManager");
    const Content = await ethers.getContractFactory("Content");
    const demoDayContractManager = ContentManager.attach("0x37c0672d200B95F072Fd10598327B52ab3bC343a");
    const demoDayContent = Content.attach("0x1dc68bB2Cd758160953Cf166f6D060aA17EA9697");

    var assets = [
        [6, "QmYyVncoxSHydDtx2YN6NFUxhUh9V9hPhyfpLgnWzkR6hk", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0],   // Rawrshak Logo
        [7, "QmapwSc6WJNoPBWEbNweLc5jfLD6tE3SCLthek8L12hrqL", "", ethers.constants.MaxUint256, ethers.constants.AddressZero, 0]   // Rawrshak Logo
    ];

    console.log("Adding new assets...");
    // add assets
    await demoDayContractManager.connect(devDemo).addAssetBatch(assets);
    
    console.log("Minting new assets...");
    // mint some assets
    var mintData = [devDemo.address, [6,7], [5,5], 0, ethers.constants.AddressZero, []];
    await demoDayContent.connect(devDemo).mintBatch(mintData);

    console.log("Sending new assets to the player...");
    await demoDayContent.connect(devDemo).safeBatchTransferFrom(devDemo.address, playerDemo.address, [6, 7], [1, 1], []);
    
    console.log("Finished.")
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
