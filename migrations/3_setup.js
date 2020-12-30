const OVCTokenContract = artifacts.require("OVCToken");
const ManagerFactory = artifacts.require("ManagerFactory");
const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const Crafting = artifacts.require("Crafting");
const CraftingManager = artifacts.require("CraftingManager");
const CraftingFactory = artifacts.require("CraftingFactory");
const Lootbox = artifacts.require("Lootbox");
const LootboxManager = artifacts.require("LootboxManager");
const LootboxFactory = artifacts.require("LootboxFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");
const Exchange = artifacts.require("Exchange");

module.exports = async function(deployer, networks, accounts) {
    deployerAddress = accounts[0];
    deployerWalletAddress = accounts[1];
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        player1Address,             // Player 1 test address
        player2Address,             // Player 2 test address
        player3Address              // Player 3 test address
    ] = accounts;

    // get OVC token with 1,000,000,000 initial supply and send some
    ovcTokenContract = await OVCTokenContract.deployed();
    await ovcTokenContract.approve(deployerAddress, 1000000, {from:deployerAddress});
    await ovcTokenContract.transfer(player1Address, 10000, {from:deployerAddress});
    await ovcTokenContract.transfer(player2Address, 5000, {from:deployerAddress});
    await ovcTokenContract.transfer(player3Address, 15000, {from:deployerAddress});

    // set up GlobalItemRegistry Contract
    registry = await GlobalItemRegistry.deployed();

    // Set up Game with test URL
    gameFactory = await GameFactory.deployed();
    await gameFactory.setGlobalItemRegistryAddr(registry.address);

    // Set up Crafting Contract
    craftingFactory = await CraftingFactory.deployed();
    await craftingFactory.setGlobalItemRegistryAddr(registry.address);

    // Set up Lootbox Contract
    lootboxFactory = await LootboxFactory.deployed();
    await lootboxFactory.setGlobalItemRegistryAddr(registry.address);
    
    // Set up Crafting Contract
    exchange = await Exchange.deployed();
    await exchange.setGlobalItemRegistryAddr(registry.address);

    // Setup Manager Factory
    managerFactory = await ManagerFactory.deployed();

    // Generate Game Manager
    await managerFactory.createGameManagerContract();
    gameManagerAddr = await managerFactory.gameManagerAddresses(deployerAddress, 0);
    gameManager = await GameManager.at(gameManagerAddr);

    // Create Game Contract
    await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");
    gameAddr = await gameManager.gameAddr();
    game = await Game.at(gameAddr);
    
    // Generate Crafting Manager
    await managerFactory.createCraftingManagerContract();
    craftingManagerAddr = await managerFactory.craftingManagerAddresses(deployerAddress, 0);
    craftingManager = await CraftingManager.at(craftingManagerAddr);

    // Create Crafting Contract
    await craftingManager.generateCraftingContract(craftingFactory.address);
    craftingAddr = await craftingManager.craftingAddr();
    crafting = await Crafting.at(craftingAddr);
    await craftingManager.setGlobalItemRegistryAddr(registry.address);
    await craftingManager.setDeveloperWallet(deployerWalletAddress);

    // Generate Lootbox Manager
    await managerFactory.createLootboxManagerContract();
    lootboxManagerAddr = await managerFactory.lootboxManagerAddresses(deployerAddress, 0);
    lootboxManager = await LootboxManager.at(lootboxManagerAddr);

    // Create Lootbox Contract
    await lootboxManager.generateLootboxContract(lootboxFactory.address, "https://testgame.com/api/lootbox/{id}.json");
    lootboxAddr = await lootboxManager.getLootboxAddress(0);
    lootbox = await Lootbox.at(lootboxAddr);
    await lootboxManager.setGlobalItemRegistryAddr(registry.address);

    // Set crafting and lootbox address as both minter and burner
    minter_role = await gameManager.MINTER_ROLE();
    burner_role = await gameManager.BURNER_ROLE();
    await gameManager.grantRole(minter_role, craftingAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(burner_role, craftingAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(minter_role, lootboxAddr, {from: deployerAddress, gasPrice: 1});
    await gameManager.grantRole(burner_role, lootboxAddr, {from: deployerAddress, gasPrice: 1});
    
    /*****************************************/
    /*****       Game Data               *****/
    /*****************************************/
    // Add some test items
    [material1, material2, material3] = [0,1,2];
    await gameManager.createItem(player1Address, material1, 0, {from:deployerAddress, gasPrice: 1});
    await gameManager.createItem(player1Address, material2, 0, {from:deployerAddress, gasPrice: 1});
    await gameManager.createItem(player2Address, material3, 0, {from:deployerAddress, gasPrice: 1});
    await gameManager.mint(player3Address, material1, 15, {from:deployerAddress, gasPrice: 1});
    await gameManager.mint(player1Address, material2, 2, {from:deployerAddress, gasPrice: 1});
    await gameManager.mint(player2Address, material3, 3, {from:deployerAddress, gasPrice: 1});

    // mint batch
    [reward1, reward2, reward3] = [10,11,12];
    rewards = [reward1, reward2, reward3];
    amounts = [0,0,0];
    mintAmounts = [1,1,1];
    await gameManager.createItemBatch(deployerAddress, rewards, amounts, {from:deployerAddress, gasPrice: 1});
    await gameManager.mintBatch(player1Address, rewards, mintAmounts, {from:deployerAddress, gasPrice: 1});

    // burn
    await gameManager.burn(player3Address, material1, 7, {from:deployerAddress, gasPrice: 1});

    /*****************************************/
    /*****       Exchange Data           *****/
    /*****************************************/
    // Create 2 Bids and 2 Asks
    await ovcTokenContract.approve(exchange.address, 500, {from: player2Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player2Address, gasPrice: 1});
    await game.setApprovalForAll(exchange.address, true, {from: player3Address, gasPrice: 1});
    
    uuid1 = await registry.getUUID(game.address, material1);
    uuid2 = await registry.getUUID(game.address, material2);
    uuid3 = await registry.getUUID(game.address, material3);

    // Player 2 wants to buy Mat1 and Mat2
    bidPlacedEvent = await exchange.placeBid(player2Address, ovcTokenContract.address, uuid1, 1, 100);
    await exchange.placeBid(player2Address, ovcTokenContract.address, uuid2, 2, 100);

    // Player 2 is selling Mat3
    // Player 3 is selling Mat1
    askPlacedEvent = await exchange.placeAsk(player2Address, ovcTokenContract.address, uuid3, 1, 200);
    askPlacedEvent2 = await exchange.placeAsk(player3Address, ovcTokenContract.address, uuid1, 1, 300);

    // Delete 1 Bid
    orderId = bidPlacedEvent.logs[0].args[6];
    await exchange.deleteOrder(orderId, {from: player2Address, gasPrice: 1});

    // Fullfill asks
    askId1 = askPlacedEvent.logs[0].args[6];
    await ovcTokenContract.approve(exchange.address, 500, {from: player1Address, gasPrice: 1});
    await exchange.fullfillOrder(askId1, {from: player1Address, gasPrice: 1});
    
    askId2 = askPlacedEvent2.logs[0].args[6];
    await exchange.fullfillOrder(askId2, {from: player1Address, gasPrice: 1});

    // Claim Player 2 sold material
    await exchange.claim(askId1, {from: player2Address, gasPrice: 1});
        
    /*****************************************/
    /*****       Crafting Data           *****/
    /*****************************************/
    rewarduuid1 = await registry.getUUID(game.address, reward1);
    materialIds = [uuid1, uuid2, uuid3];
    materialAmounts = [2, 1, 1];
    rewardIds = [rewarduuid1];
    rewardAmounts = [1];
    await craftingManager.createRecipe(
        materialIds,
        materialAmounts,
        rewardIds,
        rewardAmounts,
        ovcTokenContract.address,
        100,
        true,
        {from:deployerAddress}
    );

    // Craft the recipe
    // make sure player 1 has the materials
    materialIds = [material1, material2, material3];
    await gameManager.mintBatch(player1Address, materialIds, materialAmounts, {from:deployerAddress, gasPrice: 1});
    await ovcTokenContract.approve(crafting.address, 100, {from: player1Address, gasPrice: 1});

    // Craft recipe 0, as created above.
    await crafting.craftItem(0, player1Address, {from:player1Address, gasPrice:1});

    /*****************************************/
    /*****       Lootbox Data            *****/
    /*****************************************/
    // Add rewards
    [commonReward, uncommonReward, scarceReward, rareReward, superRareReward, exoticReward, mythicReward] = [3,4,5,6,7,8,9];
    itemIds = [
        commonReward,
        uncommonReward,
        scarceReward,
        rareReward,
        superRareReward,
        exoticReward,
        mythicReward
    ];
    maxSupplies = [0, 0, 0, 0, 0, 0, 0];
    await gameManager.createItemBatch(deployerAddress, itemIds, maxSupplies, {from:deployerAddress});

    // Set up input items
    uuids = [uuid1, uuid2, uuid3];
    amounts = [1, 1, 1];
    multipliers = [1, 1, 1];
    await lootboxManager.registerInputItemBatch(
        0,
        uuids,
        amounts,
        multipliers,
        {from:deployerAddress}
    );

    // Mint materials for player 3
    amounts = [3, 3, 3];
    await gameManager.mintBatch(player3Address, materialIds, amounts, {from:deployerAddress, gasPrice: 1});

    // Set up reward items
    commonUuid = await registry.getUUID(game.address, commonReward);
    uncommonUuid = await registry.getUUID(game.address, uncommonReward);
    scarceUuid = await registry.getUUID(game.address, scarceReward);
    rareUuid = await registry.getUUID(game.address, rareReward);
    superRareUuid = await registry.getUUID(game.address, superRareReward);
    exoticUuid = await registry.getUUID(game.address, exoticReward);
    mythicUuid = await registry.getUUID(game.address, mythicReward);
    
    rewardUuids = [commonUuid, uncommonUuid, scarceUuid, rareUuid, superRareUuid, exoticUuid, mythicUuid];
    amounts = [1, 1, 1, 1, 1, 1, 1];
    rarities = [6, 5, 4, 3, 2, 1, 0];
    await lootboxManager.registerRewardBatch(
        0,
        rewardUuids,
        rarities,
        amounts,
        {from:deployerAddress}
    );
    
    // Generate 2 lootboxes for Player 3
    uuids = [uuid1, uuid2, uuid3];
    amounts = [3, 3, 3];
    await lootbox.generateLootbox(uuids, amounts, {from: player3Address});

    // Open 1 lootbox for Player 3
    await lootbox.openLootbox(2, {from: player3Address});
};
