require("@nomiclabs/hardhat-waffle");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-web3");
require('@typechain/hardhat');
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-truffle5");

// Load environment variables from .env
require('dotenv').config();

// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// Load environment variables from .env
require('dotenv').config();

// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    networks: {
        hardhat: {
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk'
            }
        },
        optimistic_local: {
            url: 'http://127.0.0.1:8545',
            accounts: {
                mnemonic: 'test test test test test test test test test test test junk'
            },
            gasPrice: 0
        },
        optimistic_kovan: {
            chainId: 69,
            url: 'https://kovan.optimism.io',
            accounts: [process.env.KOVAN_PRIVATE_KEY,
                process.env.DEV1_PRIVATE_KEY,
                process.env.DEV2_PRIVATE_KEY,
                process.env.DEV3_PRIVATE_KEY,
                process.env.PLAYER_1_PRIVATE_KEY,
                process.env.PLAYER_2_PRIVATE_KEY,
                process.env.PLAYER_3_PRIVATE_KEY,
                process.env.PLAYER_4_PRIVATE_KEY]
        },
        kovan: {
            chainId: 42,
            url: 'https://kovan.infura.io/v3/e81f88c751474c8695f35f6e5193b0e0',
            accounts: [process.env.KOVAN_PRIVATE_KEY]
        }
    },
    solidity: "0.8.3"
};
