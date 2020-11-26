const Game = artifacts.require("Game");
const Lootbox = artifacts.require("Lootbox");
const GlobalItemRegistry = artifacts.require("GlobalItemRegistry");

contract('Lootbox Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        lbManagerAddress,           // Developer Address for managing the Lootbox Contract
        smithAddress,               // Lootbox Service Address
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

    const Rarity = {Mythic:0, Exotic:1, SuperRare:2, Rare:3, Scarce:4, Uncommon:5, Common:6};
    const DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT = 4;
    const zero_address = "0x0000000000000000000000000000000000000000";

    it('Check Lootbox Contract Roles', async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const default_admin_role = await lootbox.DEFAULT_ADMIN_ROLE();
        const manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(default_admin_role, deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await lootbox.hasRole(manager_role, deployerAddress),
            true,
            "Deployer address does not have the lootbox manager role");

        // give Lootbox manager address the necessary roles
        await lootbox.grantRole(manager_role, lbManagerAddress, {from:deployerAddress});

        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        assert.equal(
            await game.hasRole(minter_role, lootbox.address),
            true,
            "Lootbox Contract does not have the burner role on Game Contract");

        assert.equal(
            await game.hasRole(burner_role, lootbox.address),
            true,
            "Lootbox Contract does not have the burner role on Game Contract");
    });

    it("Game Contract Data Setup", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const gc_manager_role = await game.MANAGER_ROLE();
        const minter_role = await game.MINTER_ROLE();
        const burner_role = await game.BURNER_ROLE();

        // transfer the lootbox contract ownership
        await lootbox.transferOwnership(developerWalletAddress);
        
        await game.grantRole(gc_manager_role, gcManagerAddress, {from:deployerAddress});
        await game.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await game.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await game.hasRole(gc_manager_role, gcManagerAddress),
            true,
            "Item Manager Address didn't have the Item Manager Role"
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
        await game.createItemBatch(zero_address, itemIds, maxSupplies, {from:gcManagerAddress});
        
        // Check if the new items were added.
        assert.equal(await game.length(), 17, "The 17 new items were not created.");

        // make sure all 5 items were added in the global registry correctly
        assert.equal(await registry.length(), 17, "The items were not added in the registry correctly.");
    });

    it("Register Input Items", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(manager_role, lbManagerAddress),
            true,
            "Lootbox Manager address does not have the lootbox manager role"
        );

        // Test Register Input Item 
        input1UUID = await registry.getUUID(game.address, inputItem0);
        addedInputItemEvent = await lootbox.registerInputItem(input1UUID, 1, 1, {from:lbManagerAddress});
        assert.equal(
            addedInputItemEvent.logs[0].args[0].toString(),
            input1UUID,
            "InputItem 0 was not added"
        );
        
        // Test Register Input Item Batch
        uuids = [
            await registry.getUUID(game.address, inputItem1),
            await registry.getUUID(game.address, inputItem2),
            await registry.getUUID(game.address, inputItem3),
            await registry.getUUID(game.address, inputItem4),
            await registry.getUUID(game.address, inputItem5),
            await registry.getUUID(game.address, inputItem6),
            await registry.getUUID(game.address, inputItem7),
            await registry.getUUID(game.address, inputItem8),
            await registry.getUUID(game.address, inputItem9)
        ];
        
        amounts = [2, 2, 2, 3, 3, 3, 4, 4, 4];
        multipliers = [1, 1, 1, 1, 1, 1, 1, 1, 1];

        addedInputItemBatchEvent = await lootbox.registerInputItemBatch(
            uuids,
            amounts,
            multipliers,
            {from:lbManagerAddress}
        );

        // Check if item 1 was added        
        assert.equal(
            addedInputItemBatchEvent.logs[0].args[0][0].toString(),
            uuids[0],
            "InputItem 1 was not added"
        );        
    });

    it("Register Reward Items", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();
        const manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(manager_role, lbManagerAddress),
            true,
            "Lootbox Manager address does not have the lootbox manager role"
        );

        // Test Register Reward Item 
        commonUuid = await registry.getUUID(game.address, commonReward),
        addedRewardEvent = await lootbox.registerReward(commonUuid, Rarity.Common, 1, {from:lbManagerAddress});

        assert.equal(
            addedRewardEvent.logs[0].args[0].toString(),
            commonUuid,
            "common reward was not added"
        );
        
        // Test Register Reward Item Batch
        uuids = [
            await registry.getUUID(game.address, uncommonReward),
            await registry.getUUID(game.address, scarceReward),
            await registry.getUUID(game.address, rareReward),
            await registry.getUUID(game.address, superRareReward),
            await registry.getUUID(game.address, exoticReward),
            await registry.getUUID(game.address, mythicReward)
        ];
        
        rarities = [Rarity.Uncommon, Rarity.Scarce, Rarity.Rare, Rarity.SuperRare, Rarity.Exotic, Rarity.Mythic];
        amounts = [1, 1, 1, 1, 1, 1];
        addedRewardBatchEvent = await lootbox.registerRewardBatch(uuids, rarities, amounts, {from:lbManagerAddress});

        // Check if item 1 was added        
        assert.equal(
            addedRewardBatchEvent.logs[0].args[0][0].toString(),
            uuids[0],
            "Uncommon reward item was not added"
        );  
    });

    it("View Rewards", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // check Mythic rewards
        rewards = await lootbox.getRewards(Rarity.Mythic);
        uuid = await registry.getUUID(game.address, mythicReward);
        assert.equal(rewards[0][0].toString(), uuid, "Mythic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Mythic Reward item amount is not correct.");
        
        // check Exotic rewards
        rewards = await lootbox.getRewards(Rarity.Exotic);
        uuid = await registry.getUUID(game.address, exoticReward);
        assert.equal(rewards[0][0].toString(), uuid, "Exotic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Exotic Reward item amount is not correct.");
        
        // check SuperRare rewards
        rewards = await lootbox.getRewards(Rarity.SuperRare);
        uuid = await registry.getUUID(game.address, superRareReward);
        assert.equal(rewards[0][0].toString(), uuid, "SuperRare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "SuperRare Reward item amount is not correct.");
        
        // check Rare rewards
        rewards = await lootbox.getRewards(Rarity.Rare);
        uuid = await registry.getUUID(game.address, rareReward);
        assert.equal(rewards[0][0].toString(), uuid, "Rare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Rare Reward item amount is not correct.");
        
        // check Scarce rewards
        rewards = await lootbox.getRewards(Rarity.Scarce);
        uuid = await registry.getUUID(game.address, scarceReward);
        assert.equal(rewards[0][0].toString(), uuid, "Scarce Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Scarce Reward item amount is not correct.");
        
        // check Uncommon rewards
        rewards = await lootbox.getRewards(Rarity.Uncommon);
        uuid = await registry.getUUID(game.address, uncommonReward);
        assert.equal(rewards[0][0].toString(), uuid, "Uncommon Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Uncommon Reward item amount is not correct.");

        // check Common rewards
        rewards = await lootbox.getRewards(Rarity.Common);
        uuid = await registry.getUUID(game.address, commonReward);
        assert.equal(rewards[0][0].toString(), uuid, "Common Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Common Reward item amount is not correct.");
    });

    it("Get Required Input Item Amount", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();

        uuid = await registry.getUUID(game.address, inputItem0);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 1, "Input Item 0 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem1);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 1 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem2);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 2 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem3);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 2, "Input Item 3 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem4);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 4 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem5);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 5 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem6);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 3, "Input Item 6 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem7);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 7 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem8);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 8 amount incorrect.");
        uuid = await registry.getUUID(game.address, inputItem9);
        assert.equal(await lootbox.getRequiredInputItemAmount(uuid), 4, "Input Item 9 amount incorrect.");
    });

    it("Get Game Asset information", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // check rarity for input item
        uuid = await registry.getUUID(game.address, inputItem0);
        result = await lootbox.getRarity(uuid);
        assert.equal(result.length, 0, "Input Item 0 shouldn't have any rarities.");
        
        // check rarity for reward item
        uuid = await registry.getUUID(game.address, mythicReward);
        result = await lootbox.getRarity(uuid);
        assert.equal(result[0], Rarity.Mythic, "Rarity for mythic item is not set to Mythic.");
    });

    it("Update Lootbox Settings", async () => {
        const lootbox = await Lootbox.deployed();

        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getTradeInMinimum()).toNumber(),
            DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT,
            "Default Trade In Minimum amount is incorrect."
        );

        // Set the Required Input Items Amount
        await lootbox.setTradeInMinimum(5);
        
        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getTradeInMinimum()).toNumber(),
            5,
            "Set Trade In Minimum is incorrect."
        );
        
        await lootbox.setTradeInMinimum(DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT);
    });

    it("Generate Lootbox", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const registry = await GlobalItemRegistry.deployed();

        // Mint the items and send to the player address
        items = [inputItem0, inputItem1, inputItem4];
        amounts = [2, 3, 7];
        await game.mintBatch(playerAddress, items, amounts, {from: gcManagerAddress});

        // Generate a loot box
        uuid0 = await registry.getUUID(game.address, inputItem0);
        uuid1 = await registry.getUUID(game.address, inputItem1);
        uuid4 = await registry.getUUID(game.address, inputItem4);
        uuids = [uuid0, uuid1, uuid4];
        await lootbox.generateLootbox(uuids, amounts, {from: playerAddress});
        
        // check how many lootboxes were created
        assert.equal(await lootbox.balanceOf(playerAddress, 0), 1, "Incorrect number of lootboxes");

        // check how many items the player has left
        assert.equal(await game.balanceOf(playerAddress, inputItem0), 0, "Input Item 0 was not burned properly.");
        assert.equal(await game.balanceOf(playerAddress, inputItem1), 1, "Input Item 1 was not burned properly.");
        assert.equal(await game.balanceOf(playerAddress, inputItem4), 4, "Input Item 4 was not burned properly.");
    });

    it("Open Lootbox", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();

        // open lootbox and check how many lootboxes were opened
        lootboxOpenedEvent = await lootbox.openLootbox(1, {from: playerAddress});
        assert.equal(lootboxOpenedEvent.logs[2].args[0], 1, "Incorrect number of lootboxes opened");
    });
});