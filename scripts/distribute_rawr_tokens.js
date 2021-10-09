const { ethers, upgrades } = require("hardhat");

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

    await rawr.transfer(player1.address, web3.utils.toWei('10000', 'ether'));
    await rawr.transfer(player2.address, web3.utils.toWei('10000', 'ether'));
    await rawr.transfer(player3.address, web3.utils.toWei('10000', 'ether'));
    await rawr.transfer(player4.address, web3.utils.toWei('10000', 'ether'));
    
    var playerBalance = web3.utils.fromWei((await rawr.balanceOf(player1.address)).toString(), 'ether');
    console.log(`Player 1 balance: ${playerBalance.toString()}`);
    playerBalance= web3.utils.fromWei((await rawr.balanceOf(player2.address)).toString(), 'ether');
    console.log(`Player 2 balance: ${playerBalance.toString()}`);
    playerBalance= web3.utils.fromWei((await rawr.balanceOf(player3.address)).toString(), 'ether');
    console.log(`Player 3 balance: ${playerBalance.toString()}`);
    playerBalance= web3.utils.fromWei((await rawr.balanceOf(player4.address)).toString(), 'ether');
    console.log(`Player 4 balance: ${playerBalance.toString()}`);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });