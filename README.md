# Rawrshak
This project will contain the implementation of the Rawrshak Smart Contracts

# Token: Rawrshak Token [RAWR]
Rawrshak Token are the platform currency that will be used for Governance and transactions.

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

## Truffle and Ganache
    [Truffle Suite](https://www.trufflesuite.com/truffle)
    We're using Truffle as the development framework for ethereum

    Install:
        npm install truffle -g 
        npm install -g truffle ganache-cli

## Truffle Assertions (https://www.npmjs.com/package/truffle-assertions)
    Helper functions for unit testing w/ truffle. Allows you to setup your test functions to pass on a failure (like function revert due to require statement failing).

    Install: 
        npm install truffle-assertions
        
## OpenZeppelin (https://github.com/OpenZeppelin/openzeppelin-contracts)
    Helpful standard solidity library
    
    Install:
        npm install @openzeppelin/contracts
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

### Truffle Commands
    truffle develop
        - starts the truffle server
    truffle compile
        - compiles the smart contracts in the contracts folder
    truffle migrate --reset
        - migrate and replace existing deployed contracts
        - this compiles and runs the files in the migrations folder
    truffle test
        - runs all the tests in the test folder
    truffle test ./test/<test>.js
        - runs tests in the specific file
    truffle migrate --network <ropsten>
        - migrates and deploys contract to the ropsten test network
    truffle run contract-size 

    Notes: if you start the truffle server, to use the commands above, you just need to omit the 'truffle'
    ex. running 'compile' in the truffle server will compile the smart contracts in the contracts folder

## To run a Deterministic Ganache ethereum blockchain
    1. Open a new powershell/command prompt
    2. run:
        ganache-cli -h 0.0.0.0 -m "violin couple forest beyond despair spray wide badge buddy thunder menu same"
        The seed phrase above is a test seed phrase that I use to make the first deployed contract addresses match
        the addresses in the graph node. Addresses need to be updated if you decide to use a different set of seed
        words.
    
## To set up the local graph node:
    1. refer to the [Rawrshak Graph Node project](https://github.com/gcbsumid/rawrshak-graphnode) for instructions

## Running Tests
    truffle develop
        - to open the truffle server
    test
        - to run all the tests inside the truffle server
    test <*.js>
        - to run specific tests inside the javascript file inside the truffle server
