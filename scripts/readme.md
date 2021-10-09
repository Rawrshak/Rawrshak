# Subgraph Deployment Scripts

## Hardhat commands
    npx hardhat compile
        - compiles the smart contracts
    npx hardhat node
        - starts a local node

## Local Node
    npx hardhat node

## Deploy System Contracts

### Deploy to Local Node
    npx hardhat run --network localhost scripts/deploy.js

### Deploy to live network
    npx hardhat run --network <network> scripts/deploy.js

## Deploy Test Data
    npx hardhat run --network localhost scripts/distribute_rawr_tokens.js
    npx hardhat run --network localhost scripts/subgraph_data.js
