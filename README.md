# Rawrshak
This project will contain the implementation of the Rawrshak Smart Contracts

# Token: Omniverse Credits [OVC]
Omniverse Credits are the platform currency that will be used for transactions.

## Christian's Tasks:
- Set up "Get Started" instructions
- Replace OVC with RAWR tokens
- Fix 11_test_setup.js to correctly run tests
- After committing the proof of concept, need to start properly writing the Unity Plugins

## Independent Tasks
- Implement [Secondary Sales Fees](https://docs.opensea.io/docs/10-setting-fees-on-secondary-sales) - OpenSea has an interface for this. 
    - Determine the best architecture for this (push vs pull models, immediately send tokens or accumulate and send weekly, etc)
- Investigate [Gasless transactions](https://docs.openzeppelin.com/learn/sending-gasless-transactions)
- Refactor Exchange, Lootbox, and Crafting Contracts. Separate out functionality and data into their own sub contracts
- Investigate [Chainlink's VRF](https://docs.chain.link/docs/chainlink-vrf) for proper randomization for the Lootbox Contract
- Investigate Matic (now Polygon) Network vs xDai Protocol for Layer 2 solution
- Investigate how to make smart contracts upgradable without having to migrate data from older smart contracts. 

## Done Todo:
- Infrastructure Smart Contracts
    - Game Contract, Lootbox Contract, Crafting Contract, Exchange Contract
- Graph Node
    - Docker for local graph node
    - Graph Node API which can be accessible via GraphQL api
    - Set up demo data for testing
- Set up a JSON server for querying game and asset data
- Implement Unity Project that allows for Viewing Asset Information
- Proof of concept for serving standardized cloud assets and loading them in a game during runtime