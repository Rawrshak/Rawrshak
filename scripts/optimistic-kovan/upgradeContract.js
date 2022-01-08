// scripts/upgradeContract.js
const { ethers, upgrades } = require("hardhat");

async function main() {
  const AddressResolver = await ethers.getContractFactory("AddressResolver");
  const resolver = AddressResolver.attach("0x0f8AF298f1bF349e32d7e9a7afa9F028E62987D5");

  /************************************************************************************/
  /* In order to upgrade a contract, you must first get the address of that contract, */
  /* and then you must compile and set the corresponding contracts below.             */
  /************************************************************************************/
  
  // CONTRACT_ORDERBOOK = 0xd9ff7618
  const initialContractAddress = await resolver.getAddress("0xd9ff7618");
  console.log("Upgraded Contract:", initialContractAddress);

  // Upgrading the Orderbook Contract
  const UpgradedContract = await ethers.getContractFactory("Orderbook");
  const contract = await upgrades.upgradeProxy(initialContractAddress, UpgradedContract);
  console.log("Upgraded Contract:", contract.address);
}

main();