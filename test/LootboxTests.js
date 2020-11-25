const Game = artifacts.require("Game");
const Lootbox = artifacts.require("Lootbox");

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
        assert.equal((await game.length()).toNumber(), 17, "The 17 new items were not created");
    });

    it("Register Input Items", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(manager_role, lbManagerAddress),
            true,
            "Lootbox Manager address does not have the lootbox manager role"
        );

        // Test Register Input Item 
        addedInputItemEvent = await lootbox.registerInputItem(
            game.address,
            inputItem0,
            1,
            1,
            {from:lbManagerAddress}
        );
        id = await lootbox.getLootboxId(game.address, inputItem0, {from:lbManagerAddress});

        assert.equal(
            addedInputItemEvent.logs[0].args[0].toString(),
            id,
            "InputItem 0 was not added"
        );
        
        // Test Register Input Item Batch
        ids = [
            inputItem1, inputItem2, inputItem3,
            inputItem4, inputItem5, inputItem6,
            inputItem7, inputItem8, inputItem9
        ];
        
        amounts = [2, 2, 2, 3, 3, 3, 4, 4, 4];
        multipliers = [1, 1, 1, 1, 1, 1, 1, 1, 1];

        addedInputItemBatchEvent = await lootbox.registerInputItemBatch(
            game.address,
            ids,
            amounts,
            multipliers,
            {from:lbManagerAddress}
        );

        // Check if item 1 was added
        id = await lootbox.getLootboxId(game.address, inputItem1, {from:lbManagerAddress});
        
        assert.equal(
            addedInputItemBatchEvent.logs[0].args[0][0].toString(),
            id,
            "InputItem 1 was not added"
        );        
    });

    it("Register Reward Items", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(manager_role, lbManagerAddress),
            true,
            "Lootbox Manager address does not have the lootbox manager role"
        );

        // Test Register Reward Item 
        addedRewardEvent = await lootbox.registerReward(
            game.address,
            commonReward,
            Rarity.Common,
            1,
            {from:lbManagerAddress}
        );
        id = await lootbox.getLootboxId(game.address, commonReward, {from:lbManagerAddress});

        assert.equal(
            addedRewardEvent.logs[0].args[0].toString(),
            id,
            "common reward was not added"
        );
        
        // Test Register Reward Item Batch
        ids = [
            uncommonReward, scarceReward, rareReward,
            superRareReward, exoticReward, mythicReward
        ];
        
        rarities = [Rarity.Uncommon, Rarity.Scarce, Rarity.Rare, Rarity.SuperRare, Rarity.Exotic, Rarity.Mythic];
        amounts = [1, 1, 1, 1, 1, 1];

        addedRewardBatchEvent = await lootbox.registerRewardBatch(
            game.address,
            ids,
            rarities,
            amounts,
            {from:lbManagerAddress}
        );

        // Check if item 1 was added
        id = await lootbox.getLootboxId(game.address, uncommonReward, {from:lbManagerAddress});
        
        assert.equal(
            addedRewardBatchEvent.logs[0].args[0][0].toString(),
            id,
            "Uncommon reward item was not added"
        );  
    });

    it("View Rewards", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();

        // check Mythic rewards
        rewards = await lootbox.getRewards(Rarity.Mythic);
        hashId = await lootbox.getLootboxId(game.address, mythicReward);
        assert.equal(rewards[0][0].toString(), hashId, "Mythic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Mythic Reward item amount is not correct.");
        
        // check Exotic rewards
        rewards = await lootbox.getRewards(Rarity.Exotic);
        hashId = await lootbox.getLootboxId(game.address, exoticReward);
        assert.equal(rewards[0][0].toString(), hashId, "Exotic Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Exotic Reward item amount is not correct.");
        
        // check SuperRare rewards
        rewards = await lootbox.getRewards(Rarity.SuperRare);
        hashId = await lootbox.getLootboxId(game.address, superRareReward);
        assert.equal(rewards[0][0].toString(), hashId, "SuperRare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "SuperRare Reward item amount is not correct.");
        
        // check Rare rewards
        rewards = await lootbox.getRewards(Rarity.Rare);
        hashId = await lootbox.getLootboxId(game.address, rareReward);
        assert.equal(rewards[0][0].toString(), hashId, "Rare Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Rare Reward item amount is not correct.");
        
        // check Scarce rewards
        rewards = await lootbox.getRewards(Rarity.Scarce);
        hashId = await lootbox.getLootboxId(game.address, scarceReward);
        assert.equal(rewards[0][0].toString(), hashId, "Scarce Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Scarce Reward item amount is not correct.");
        
        // check Uncommon rewards
        rewards = await lootbox.getRewards(Rarity.Uncommon);
        hashId = await lootbox.getLootboxId(game.address, uncommonReward);
        assert.equal(rewards[0][0].toString(), hashId, "Uncommon Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Uncommon Reward item amount is not correct.");

        // check Common rewards
        rewards = await lootbox.getRewards(Rarity.Common);
        hashId = await lootbox.getLootboxId(game.address, commonReward);
        assert.equal(rewards[0][0].toString(), hashId, "Common Reward item is not the same.");
        assert.equal(rewards[1][0], 1, "Common Reward item amount is not correct.");
    });

    it("Get Required Input Item Amount", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();

        hashId = await lootbox.getLootboxId(game.address, inputItem0);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 1, "Input Item 0 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem1);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 2, "Input Item 1 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem2);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 2, "Input Item 2 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem3);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 2, "Input Item 3 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem4);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 3, "Input Item 4 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem5);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 3, "Input Item 5 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem6);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 3, "Input Item 6 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem7);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 4, "Input Item 7 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem8);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 4, "Input Item 8 amount incorrect.");
        hashId = await lootbox.getLootboxId(game.address, inputItem9);
        assert.equal(await lootbox.getRequiredInputItemAmount(hashId), 4, "Input Item 9 amount incorrect.");
    });

    it("Get Game Asset information", async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();

        // check rarity for input item
        hashId = await lootbox.getLootboxId(game.address, inputItem0);
        result = await lootbox.getRarity(hashId);
        assert.equal(result.length, 0, "Input Item 0 shouldn't have any rarities.");
        
        // check rarity for reward item
        hashId = await lootbox.getLootboxId(game.address, mythicReward);
        result = await lootbox.getRarity(hashId);
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

        // Mint the items and send to the player address
        items = [inputItem0, inputItem1, inputItem4];
        amounts = [2, 3, 7];
        await game.mintBatch(playerAddress, items, amounts, {from: gcManagerAddress});

        // Generate a loot box
        hashId0 = await lootbox.getLootboxId(game.address, inputItem0);
        hashId1 = await lootbox.getLootboxId(game.address, inputItem1);
        hashId4= await lootbox.getLootboxId(game.address, inputItem4);
        hashIds = [hashId0, hashId1, hashId4];
        await lootbox.generateLootbox(hashIds, amounts, {from: playerAddress});
        
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