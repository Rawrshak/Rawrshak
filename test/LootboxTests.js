const Game = artifacts.require("Game");
const GameManager = artifacts.require("GameManager");
const GameFactory = artifacts.require("GameFactory");
const ManagerFactory = artifacts.require("ManagerFactory");
const Lootbox = artifacts.require("Lootbox");
const LootboxManager = artifacts.require("LootboxManager");
const LootboxFactory = artifacts.require("LootboxFactory");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

contract('Lootbox Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        lbManagerAddress,           // Developer Address for managing the Lootbox Contract
        playerAddress,              // Player Address
        developerWalletAddress      // Developer Wallet Address
    ] = accounts;
    const [
        inputItem0,
        inputItem1,
        inputItem2,
        inputItem3,
        inputItem4,
        inputItem5,
        inputItem6,
        inputItem7,
        inputItem8,
        inputItem9,
    ] = [0,1,2,3,4,5,6,7,8,9];
    const [
        commonReward,
        uncommonReward,
        scarceReward,
        rareReward,
        superRareReward,
        exoticReward,
        mythicReward
    ] = [10,11,12,13,14,15,16];

    const Rarity = {Common:0, Uncommon:1, Scarce:2, Rare:3, SuperRare:4, Exotic:5, Mythic:6};
    const DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT = 4;
    const zero_address = "0x0000000000000000000000000000000000000000";
    var game, gameManager, itemRegistry;
    var lootbox, lootboxManager, lootboxId;
    var default_admin_role, manager_role, minter_role, burner_role;

    it('Setup', async () => {
        itemRegistry = await GlobalItemRegistry.deployed();

        // Setup Manager Factory
        managerFactory = await ManagerFactory.deployed();

        // Setup Game Factory
        gameFactory = await GameFactory.deployed();
        await gameFactory.setGlobalItemRegistryAddr(itemRegistry.address);

        // Setup Game Manager
        gameManagerCreatedEvent = await managerFactory.createGameManagerContract();
        gameManagerAddress = gameManagerCreatedEvent.logs[0].args[1];
        gameManager = await GameManager.at(gameManagerAddress);
        gameCreatedEvents = await gameManager.generateGameContract(gameFactory.address, "https://testgame.com/api/item/{id}.json");
        game = await Game.at(await gameManager.gameAddr());

        // Setup Lootbox Manager
        lootboxManagerCreatedEvent = await managerFactory.createLootboxManagerContract();
        lootboxManagerId = lootboxManagerCreatedEvent.logs[0].args[0];
        lootboxManagerAddress = lootboxManagerCreatedEvent.logs[0].args[1];
        owner = lootboxManagerCreatedEvent.logs[0].args[2];
        assert.equal(lootboxManagerId, 0, "Incorrect Contract Id");
        assert.equal(owner, deployerAddress, "Incorrect owner");
        lootboxManager = await LootboxManager.at(lootboxManagerAddress);
        
        // Setup Lootbox Factory
        lootboxFactory = await LootboxFactory.deployed();
        await lootboxFactory.setGlobalItemRegistryAddr(itemRegistry.address);

        // Setup Lootbox Contract
        lootboxCreatedEvents = await lootboxManager.generateLootboxContract(lootboxFactory.address, "https://testgame.com/api/lootbox/{id}.json");
        lootboxId = lootboxCreatedEvents.logs[2].args[0];
        lootboxAddress = lootboxCreatedEvents.logs[2].args[1];
        owner = lootboxCreatedEvents.logs[2].args[2];
        assert.equal(lootboxId, 0, "Incorrect Contract Id");
        assert.equal(owner, lootboxManagerAddress, "Incorrect owner");
        lootbox = await Lootbox.at(lootboxAddress);
        await lootboxManager.setGlobalItemRegistryAddr(itemRegistry.address);
    });

    it('Check Lootbox Contract Roles', async () => {
        default_admin_role = await lootboxManager.DEFAULT_ADMIN_ROLE();
        manager_role = await lootboxManager.MANAGER_ROLE();
        minter_role = await gameManager.MINTER_ROLE();
        burner_role = await gameManager.BURNER_ROLE();

        assert.equal(
            await lootboxManager.hasRole(default_admin_role, deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await lootboxManager.hasRole(manager_role, deployerAddress),
            true,
            "Deployer address does not have the lootbox manager role");

        // give Lootbox manager address the necessary roles
        await lootboxManager.grantRole(manager_role, lbManagerAddress, {from:deployerAddress});

        // give Lootbox Contract minting and burning access to the game manager
        await gameManager.grantRole(minter_role, lootbox.address, {from:deployerAddress});
        await gameManager.grantRole(burner_role, lootbox.address, {from:deployerAddress});

        assert.equal(
            await gameManager.hasRole(minter_role, lootbox.address),
            true,
            "Lootbox Contract does not have the burner role on Game Manager Contract");

        assert.equal(
            await gameManager.hasRole(burner_role, lootbox.address),
            true,
            "Lootbox Contract does not have the burner role on Game Manager Contract");
    });

    it("Game Contract Data Setup", async () => {
        // transfer the lootbox contract ownership
        // await lootbox.transferOwnership(developerWalletAddress);

        await gameManager.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await gameManager.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await gameManager.owner(),
            deployerAddress,
            "Deployer address is not the owner of the game manager"
        );

        // Add 17 items
        itemIds = [
            inputItem0,
            inputItem1,
            inputItem2,
            inputItem3,
            inputItem4,
            inputItem5,
            inputItem6,
            inputItem7,
            inputItem8,
            inputItem9,
            commonReward,
            uncommonReward,
            scarceReward,
            rareReward,
            superRareReward,
            exoticReward,
            mythicReward
        ];
        maxSupplies = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        await gameManager.createItemBatch(deployerAddress, itemIds, maxSupplies, {from:deployerAddress});
        
        // Check if the new items were added.
        assert.equal(await game.length(), 17, "The 17 new items were not created.");

        // make sure all 5 items were added in the global registry correctly
        assert.equal(await itemRegistry.length(), 17, "The items were not added in the registry correctly.");
    });

    it("Register Input Items", async () => {        
        // Test Register Input Item Batch
        uuids = [
            await itemRegistry.getUUID(game.address, inputItem0),
            await itemRegistry.getUUID(game.address, inputItem1),
            await itemRegistry.getUUID(game.address, inputItem2),
            await itemRegistry.getUUID(game.address, inputItem3),
            await itemRegistry.getUUID(game.address, inputItem4),
            await itemRegistry.getUUID(game.address, inputItem5),
            await itemRegistry.getUUID(game.address, inputItem6),
            await itemRegistry.getUUID(game.address, inputItem7),
            await itemRegistry.getUUID(game.address, inputItem8),
            await itemRegistry.getUUID(game.address, inputItem9)
        ];
        
        amounts = [1, 2, 2, 2, 3, 3, 3, 4, 4, 4];
        multipliers = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

        addedInputItemBatchEvent = await lootboxManager.registerInputItemBatch(
            lootboxId,
            uuids,
            amounts,
            multipliers,
            {from:lbManagerAddress}
        );

        // console.log(addedInputItemBatchEvent);

        // Check if item 0 was added        
        // assert.equal(
        //     addedInputItemBatchEvent.logs[0].args[0].toString(),
        //     uuids[0],
        //     "InputItem 1 was not added"
        // );
    });

    it("Register Reward Items", async () => {
        // Test Register Reward Item Batch
        uuids = [
            await itemRegistry.getUUID(game.address, commonReward),
            await itemRegistry.getUUID(game.address, uncommonReward),
            await itemRegistry.getUUID(game.address, scarceReward),
            await itemRegistry.getUUID(game.address, rareReward),
            await itemRegistry.getUUID(game.address, superRareReward),
            await itemRegistry.getUUID(game.address, exoticReward),
            await itemRegistry.getUUID(game.address, mythicReward)
        ];
        
        rarities = [Rarity.Common, Rarity.Uncommon, Rarity.Scarce, Rarity.Rare, Rarity.SuperRare, Rarity.Exotic, Rarity.Mythic];
        amounts = [1, 1, 1, 1, 1, 1, 1];
        addedRewardBatchEvent = await lootboxManager.registerRewardBatch(lootboxId, uuids, rarities, amounts, {from:lbManagerAddress});
    });

    it("View Rewards", async () => {
        // check Mythic rewards
        rewards = await lootbox.getRewards(Rarity.Mythic);
        uuid = await itemRegistry.getUUID(game.address, mythicReward);
        assert.equal(rewards[0][0].toString(), uuid, "Mythic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Mythic Reward item amount is not correct.");
        
        // check Exotic rewards
        rewards = await lootbox.getRewards(Rarity.Exotic);
        uuid = await itemRegistry.getUUID(game.address, exoticReward);
        assert.equal(rewards[0][0].toString(), uuid, "Exotic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Exotic Reward item amount is not correct.");
        
        // check SuperRare rewards
        rewards = await lootbox.getRewards(Rarity.SuperRare);
        uuid = await itemRegistry.getUUID(game.address, superRareReward);
        assert.equal(rewards[0][0].toString(), uuid, "SuperRare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "SuperRare Reward item amount is not correct.");
        
        // check Rare rewards
        rewards = await lootbox.getRewards(Rarity.Rare);
        uuid = await itemRegistry.getUUID(game.address, rareReward);
        assert.equal(rewards[0][0].toString(), uuid, "Rare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Rare Reward item amount is not correct.");
        
        // check Scarce rewards
        rewards = await lootbox.getRewards(Rarity.Scarce);
        uuid = await itemRegistry.getUUID(game.address, scarceReward);
        assert.equal(rewards[0][0].toString(), uuid, "Scarce Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Scarce Reward item amount is not correct.");
        
        // check Uncommon rewards
        rewards = await lootbox.getRewards(Rarity.Uncommon);
        uuid = await itemRegistry.getUUID(game.address, uncommonReward);
        assert.equal(rewards[0][0].toString(), uuid, "Uncommon Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Uncommon Reward item amount is not correct.");

        // check Common rewards
        rewards = await lootbox.getRewards(Rarity.Common);
        uuid = await itemRegistry.getUUID(game.address, commonReward);
        assert.equal(rewards[0][0].toString(), uuid, "Common Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Common Reward item amount is not correct.");
    });

    it("Get Required Input Item Amount", async () => {
        uuid = await itemRegistry.getUUID(game.address, inputItem0);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 1, "Input Item 0 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem1);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 1 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem2);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 2 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem3);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 3 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem4);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 4 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem5);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 5 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem6);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 6 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem7);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 7 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem8);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 8 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, inputItem9);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 9 amount incorrect.");
        uuid = await itemRegistry.getUUID(game.address, commonReward);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 0, "Common Reward shouldn't be an input");
    });

    it("Update Lootbox Settings", async () => {
        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getTradeInMinimum()).toNumber(),
            DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT,
            "Default Trade In Minimum amount is incorrect."
        );

        // Set the Required Input Items Amount
        await lootboxManager.setTradeInMinimum(lootboxId, 5);
        
        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getTradeInMinimum()).toNumber(),
            5,
            "Set Trade In Minimum is incorrect."
        );
        
        await lootboxManager.setTradeInMinimum(lootboxId, DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT);
    });

    it("Generate Lootbox", async () => {
        // Mint the items and send to the player address
        items = [inputItem0, inputItem1, inputItem4];
        amounts = [2, 3, 7];
        await gameManager.mintBatch(playerAddress, items, amounts, {from: gcManagerAddress});

        // Generate a loot box
        uuid0 = await itemRegistry.getUUID(game.address, inputItem0);
        uuid1 = await itemRegistry.getUUID(game.address, inputItem1);
        uuid4 = await itemRegistry.getUUID(game.address, inputItem4);
        uuids = [uuid0, uuid1, uuid4];
        lootboxGeneratedEvent = await lootbox.generateLootbox(uuids, amounts, {from: playerAddress});
        assert.equal(lootboxGeneratedEvent.logs[4].args[0], lootbox.address, "Incorrect Lootbox address");
        assert.equal(lootboxGeneratedEvent.logs[4].args[1], playerAddress, "Incorrect player address");
        assert.equal(lootboxGeneratedEvent.logs[4].args[2], 1, "Incorrect nuimber of lootboxes generated");
        
        // check how many lootboxes were created
        assert.equal(await lootbox.balanceOf(playerAddress, lootboxId), 1, "Incorrect number of lootboxes");

        // check how many items the player has left
        assert.equal(await game.balanceOf(playerAddress, inputItem0), 0, "Input Item 0 was not burned properly.");
        assert.equal(await game.balanceOf(playerAddress, inputItem1), 1, "Input Item 1 was not burned properly.");
        assert.equal(await game.balanceOf(playerAddress, inputItem4), 4, "Input Item 4 was not burned properly.");
    });

    it("Open Lootbox", async () => {
        // open lootbox and check how many lootboxes were opened
        lootboxOpenedEvent = await lootbox.openLootbox(1, {from: playerAddress});
        assert.equal(lootboxOpenedEvent.logs[2].args[0], lootbox.address, "Incorrect Lootbox address");
        assert.equal(lootboxOpenedEvent.logs[2].args[1], playerAddress, "Incorrect player address");
        assert.equal(lootboxOpenedEvent.logs[2].args[2], 1, "Incorrect nuimber of lootboxes opened");

        // check how many lootboxes were created
        assert.equal(await lootbox.balanceOf(playerAddress, lootboxId), 0, "Incorrect number of lootboxes left");
    });
});