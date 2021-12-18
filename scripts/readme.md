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

# Deploying To Optimistic Kovan Testnet
    1. Update RAWR token address in the scripts/optimistic-kovan folder
    2. run: `npx hardhat run --network optimistic_kovan scripts/optimistic-kovan/deploy.js`
    3. Update addresses in the subgraph_ipfs_data.js
    4. run: `npx hardhat run --network optimistic_kovan .\scripts\optimistic-kovan\subgraph_ipfs_data.js`
    5. Update addresses in the exchange_data.js
    6. run: `npx hardhat run --network optimistic_kovan .\scripts\optimistic-kovan\exchange_data.js`