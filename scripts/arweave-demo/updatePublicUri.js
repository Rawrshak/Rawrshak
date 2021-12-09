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
    const demoDayContractManager = ContentManager.attach("0x37c0672d200B95F072Fd10598327B52ab3bC343a");

    var demoDayUpdatePublicUri = [
        [5, "QmcYk3hn7ipSppYihWu2FJkvW5kgWXeTWvuDnhJQviB9m1"]
    ];

    console.log("Updating Public Uri...")
    await demoDayContractManager.connect(devDemo).setPublicUriBatch(demoDayUpdatePublicUri);
    console.log("Finished Updating Public Uri...")
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
