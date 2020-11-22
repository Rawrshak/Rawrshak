const GameContract = artifacts.require("GameContract");
const LootboxContract = artifacts.require("LootboxContract");

contract('Lootbox Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        gcManagerAddress,           // Developer Address for managing the Game Contract
        lbManagerAddress,           // Developer Address for managing the Lootbox Contract
        smithAddress,               // Lootbox Service Address
        playerAddress,              // Player Address
        developerWalletAddress      // Developer Wallet Address
    ] = accounts;
    const [material1, material2, material3, reward1, reward2] = [0,1,2,3,4];
    const [recipe0, recipe1, recipe2] = [0,1,2];

    it('Check Lootbox Contract Roles', async () => {
        const gameContract = await GameContract.deployed();
        const lootboxContract = await LootboxContract.deployed();
        const default_admin_role = await lootboxContract.DEFAULT_ADMIN_ROLE();
        const lb_manager_role = await lootboxContract.MANAGER_ROLE();

        assert.equal(
            await lootboxContract.hasRole(default_admin_role, deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await lootboxContract.hasRole(lb_manager_role, deployerAddress),
            true,
            "Deployer address does not have the lootbox manager role");

        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        assert.equal(
            await gameContract.hasRole(minter_role, lootboxContract.address),
            true,
            "Lootbox Contract does not have the burner role on Game Contract");

        assert.equal(
            await gameContract.hasRole(burner_role, lootboxContract.address),
            true,
            "Lootbox Contract does not have the burner role on Game Contract");
    });

    it("Game Contract Data Setup", async () => {
        const gameContract = await GameContract.deployed();
        const lootboxContract = await LootboxContract.deployed();
        const gc_manager_role = await gameContract.MANAGER_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();

        // transfer the lootbox contract ownership
        await lootboxContract.transferOwnership(developerWalletAddress);
        
        await gameContract.grantRole(gc_manager_role, gcManagerAddress, {from:deployerAddress});
        await gameContract.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
        await gameContract.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});
        
        // check to see if item manager address has the item manger role
        assert.equal(
            await gameContract.hasRole(gc_manager_role, gcManagerAddress),
            true,
            "Item Manager Address didn't have the Item Manager Role"
        );

        // Add 5 items
        itemIds = [material1, material2, material3, reward1, reward2];
        await gameContract.methods['createItemBatch(uint256[])'](itemIds, {from:gcManagerAddress});
        
        // Check if the new items were added.
        assert.equal(
            (await gameContract.length()).toNumber(),
            5,
            "The 5 new items were not created"
        );
    });
});