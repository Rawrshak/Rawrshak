# Rawrshak
This project will contain the implementation of the Rawrshak Smart Contracts

# Token: Rawrshak Token [RAWR]
Rawrshak Token are the platform currency that will be used for Governance and transactions.

# Alpha Testnet
We've decided to launch the alpha testnet on Optimistic Kovan because of the following reasons:
- Ease of deployment for Layer 2 solution
- Scalability Testing
- Chainsafe Gaming SDK L2 testing 

## Rawrshak Contract Addresses
Contract | Address | Version
------- | ------- | -------
RAWR Token | 0x7c6b91d9be155a6db01f749217d76ff02a7227f2 | v.1.0
AddressResolver | 0x0f8AF298f1bF349e32d7e9a7afa9F028E62987D5 | v.1.1
Exchange | 0xd73651871aCc74657e51A7233edf247C7C7495eE | v.1.1
Staking | 0xF4cB5c7ac4f61FB485E2250255C8D2C1b8660dD2 | v.1.1
ContentFactory | 0x35c18b621c5B5ccf29e3EdeC5AE0AC98B26192d3 | v.1.1

## Sample Content Contract Addresses
Contract | Content Contract | Content Manager Contract 
------- | ------- | ------- 
Rawrshak Contracts | 0x899753A7055093B1Dc32422cfFD55186a5C18198 | 0x4941DCDB7BeD6CA1F6E5A3fFAdB9f9B74736cf82
ScreamFortress2 Contracts | 0xd24d5E9EA9f55b253E08c47CfeeDD6873a88B3F5 | 0x499ad3Df0E89A42322a603f7baFD2BaDB00fe695
FightBuddy Contracts | 0x263D6c4cfBB39642f799f81c3e4475056eC72811 | 0x489FF8D093c6C44d948964A2535cfbDA53E1c87b
SuperScaryHorrorGame Contracts | 0x93ad47A42c89B345925b90a96f372BEAB84E7082 | 0x9D0Fa91D3bf89F06A6E37c60c7e2140f613CF0Fd

Note: You will still need the private keys for the developer wallet in order to add new assets to the contract. Please feel free to launch your own test data contracts.

# Tools
## Node JS and NPM
    Install [Node JS and NPM](https://nodejs.org/en/)
    To update, run:
        npm install npm@latest -g

## Yarn
    Install:
        npm install --global yarn

    Get all packages:
        yarn install

## HardHat, Waffle, and Ethers.js
    [Hardhat](https://hardhat.org/getting-started/)
    [Waffle](https://ethereum-waffle.readthedocs.io/en/latest/getting-started.html)
    [Ethers.js](https://docs.ethers.io/v5/getting-started/)
    We're using Hardhat as the development framework for ethereum

    Install:
        npm install --save-dev hardhat
        npm install --save-dev @nomiclabs/hardhat-waffle ethereum-waffle chai @nomiclabs/hardhat-ethers ethers
## OpenZeppelin (https://github.com/OpenZeppelin/openzeppelin-contracts)
    Helpful standard solidity library
    
    Install:
        npm install @openzeppelin/contracts-upgradeable
        npm install @openzeppelin/test-helpers

## Visual Studio Code
    This is lightweight IDE that I use.
    Install: https://code.visualstudio.com/

### Extensions
    Install the following extensions on Visual Studio Code
    Solidity - by juanblanco.solidity 
        Used for solidity code as well as generating the C# code for Unity
    React Native Tools - by msjsdiag.vscode-react-native
        Used for the React Native Front-end Dapp
    C# - ms-dotnettools.csharp
        For Unity Development
    C/C++ - ms-vscode.cpptools
        For Unreal Engine Development

## Unity Engine
    Download and Install from: https://store.unity.com/download

## Docker 
    Install: https://www.docker.com/products/docker-desktop
    Used for the local Graph Node deployment

## The Graph
    This is used for indexing the ethereum database. Locally, we use it against a ganache instance.
    More Info: https://thegraph.com/docs/quick-start#local-development
    Install:
        npm install -g @graphprotocol/graph-cli
        or 
        yarn global add @graphprotocol/graph-cli
    
## Inter-Planetary File System (IPFS)
    Currently used to store asset data information in a decentralized manner.
    Install: https://github.com/ipfs-shipyard/ipfs-desktop 
        Just running the IPFS desktop set up is good enough.

## Json-Server
    Used to host the Asset Info data that the NFT smart contract is pointing to
    Instructions and quick tutorial: https://www.npmjs.com/package/json-server
    Install:
        npm install -g json-server

## Other Helpful tools
### [hardhat-contract-sizer](https://www.skypack.dev/view/hardhat-contract-sizer) 
    Displays the contract size for all or a selection of your smart contracts in kilobytes. The limit for a smart 
    contract is roughly 24.5 kb, so this is a good tool to use to figure out if we need to cut down on the smart 
    contract size. 
    Install: 
        yarn add --dev hardhat-contract-sizer
    use:
        yarn run hardhat size-contracts



# Quick-start Guide

## Building the Smart Contracts
    1. Clone the repo 
    2. Download and install Node JS, NPM, yarn, Truffle, Ganache, OpenZeppelin, and Visual Studio Code
    3. Install Solidity extension in Visual Studio Code

    Everything should be configured properly. If you have any issues, contact [Christian](gcbsumid@gmail.com)

### Hardhat Commands
    npx hardhat compile
        - compiles the smart contracts
    npx hardhat node
        - starts a local node
    npx hardhat test
        - runs all tests in the test folder
    npx hardhat test <specific test>
        - runs a specific test inside the test folder

## To deploy to a local node
    npx hardhat node
    npx hardhat run --network localhost scripts/deploy.js

## To deploy to a specific network
    npx hardhat run --network <target network> scripts/deploy.js
    
## To set up the local graph node:
    1. refer to the [Rawrshak Graph Node project](https://github.com/gcbsumid/rawrshak-graphnode) for instructions

# Deploying To Optimistic Kovan Testnet
    1. Update RAWR token address in the scripts/optimistic-kovan folder
    2. run: `npx hardhat run --network optimistic_kovan scripts/optimistic-kovan/deploy.js`
    3. Update addresses in the subgraph_ipfs_data.js
    4. run: `npx hardhat run --network optimistic_kovan .\scripts\optimistic-kovan\subgraph_ipfs_data.js`
    5. Update addresses in the exchange_data.js
    6. run: `npx hardhat run --network optimistic_kovan .\scripts\optimistic-kovan\exchange_data.js`