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
        player4
    ] = await ethers.getSigners();

    const Content = await ethers.getContractFactory("Content");
    const rawrshakContract = Content.attach("0x899753A7055093B1Dc32422cfFD55186a5C18198");

    var balance = await rawrshakContract.connect(player1).balanceOf(player1.address, "3");
    console.log(`Balance: ${balance.toString()}`);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
