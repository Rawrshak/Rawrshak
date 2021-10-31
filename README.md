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
RAWR Token | 0x7c6b91d9be155a6db01f749217d76ff02a7227f2 | v.0.1
AddressResolver | 0x6196F2bc15F90bb35b8e38f2170BB2C101e3A0B1 | v.0.1
Exchange | 0x8b62eC86AddDc6Fd9741D3A307f36b06FD3A89D5 | v.0.1
Staking | 0x23e6e13AaE049f7dcc570177960Ff5023187a59A | v.0.1
ContentFactory | 0xbe479c85e81B34BcA13F613DfF4f3F9D9eC6d715 | v.0.1

## Sample Content Contract Addresses
Contract | Content Contract | Content Manager Contract 
------- | ------- | ------- 
Rawrshak Contracts | 0xc9EBafF8237740353E0dEd89130fB83be4bd3F90
ScreamFortress2 Contracts | 0x393d8E12Aa7F22f8999bf9DDAc6842Db2bb6F096
FightBuddy Contracts | 0x8896fD674aE91340570129BB9391F533ec2e9aa4
SuperScaryHorrorGame Contracts | 0x2bf2685c0Cf29FF00bDFc66041fE8efA1bcf5D7F

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
### [truffle-contract-size](https://www.npmjs.com/package/truffle-contract-size) 
    Displays the contract size for all or a selection of your smart contracts in kilobytes. The limit for a smart 
    contract is roughly 24.5 kb, so this is a good tool to use to figure out if we need to cut down on the smart 
    contract size. 
    Install: npm install truffle-contract-size


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

## To run a Deterministic Ganache ethereum blockchain
    1. Open a new powershell/command prompt
    2. run:
        ganache-cli -h 0.0.0.0 -m "violin couple forest beyond despair spray wide badge buddy thunder menu same"
        The seed phrase above is a test seed phrase that I use to make the first deployed contract addresses match
        the addresses in the graph node. Addresses need to be updated if you decide to use a different set of seed
        words.
    
## To set up the local graph node:
    1. refer to the [Rawrshak Graph Node project](https://github.com/gcbsumid/rawrshak-graphnode) for instructions
