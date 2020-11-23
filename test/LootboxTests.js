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
    
    const DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT = 4;

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
        await game.methods['createItemBatch(uint256[])'](itemIds, {from:gcManagerAddress});
        
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
            0,  // Common
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
        
        rarities = [1, 2, 3, 4, 5, 6];
        multipliers = [1, 1, 1, 1, 1, 1];

        addedRewardBatchEvent = await lootbox.registerRewardBatch(
            game.address,
            ids,
            rarities,
            multipliers,
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

    // it("View Rewards", async () => {
    //     // const game = await Game.deployed();
    //     // const lootbox = await Lootbox.deployed();
    //     // const gc_manager_role = await game.MANAGER_ROLE();
    //     // const minter_role = await game.MINTER_ROLE();
    //     // const burner_role = await game.BURNER_ROLE();

    // });

    // it("Get Required Input Item Amount", async () => {
    //     // const game = await Game.deployed();
    //     // const lootbox = await Lootbox.deployed();
    //     // const gc_manager_role = await game.MANAGER_ROLE();
    //     // const minter_role = await game.MINTER_ROLE();
    //     // const burner_role = await game.BURNER_ROLE();

    // });

    // it("Get Game Asset information", async () => {
    //     // const game = await Game.deployed();
    //     // const lootbox = await Lootbox.deployed();
    //     // const gc_manager_role = await game.MANAGER_ROLE();
    //     // const minter_role = await game.MINTER_ROLE();
    //     // const burner_role = await game.BURNER_ROLE();

    // });

    // it("Generate Lootbox", async () => {
    //     // const game = await Game.deployed();
    //     // const lootbox = await Lootbox.deployed();
    //     // const gc_manager_role = await game.MANAGER_ROLE();
    //     // const minter_role = await game.MINTER_ROLE();
    //     // const burner_role = await game.BURNER_ROLE();

    // });

    it("Update Lootbox Settings", async () => {
        // const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();

        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getRequiredInputItemsAmount()).toNumber(),
            DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT,
            "Default Required Input items amount is incorrect."
        );

        // Set the Required Input Items Amount
        await lootbox.setRequiredInputItemsAmount(5);
        
        // Check the Required Input Items Amount
        assert.equal(
            (await lootbox.getRequiredInputItemsAmount()).toNumber(),
            5,
            "Default Required Input items amount is incorrect."
        );
        
        await lootbox.setRequiredInputItemsAmount(DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT);
    });

    // it("Open Lootbox", async () => {
    //     // const game = await Game.deployed();
    //     // const lootbox = await Lootbox.deployed();
    //     // const gc_manager_role = await game.MANAGER_ROLE();
    //     // const minter_role = await game.MINTER_ROLE();
    //     // const burner_role = await game.BURNER_ROLE();

    // });
});