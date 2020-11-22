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
    const [material1, material2, material3, reward1, reward2] = [0,1,2,3,4];
    const [recipe0, recipe1, recipe2] = [0,1,2];

    it('Check Lootbox Contract Roles', async () => {
        const game = await Game.deployed();
        const lootbox = await Lootbox.deployed();
        const default_admin_role = await lootbox.DEFAULT_ADMIN_ROLE();
        const lb_manager_role = await lootbox.MANAGER_ROLE();

        assert.equal(
            await lootbox.hasRole(default_admin_role, deployerAddress),
            true,
            "Deployer address does not have the default admin role");
            
        assert.equal(
            await lootbox.hasRole(lb_manager_role, deployerAddress),
            true,
            "Deployer address does not have the lootbox manager role");

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

    // it("Game Contract Data Setup", async () => {
    //     const game = await Game.deployed();
    //     const lootbox = await Lootbox.deployed();
    //     const gc_manager_role = await game.MANAGER_ROLE();
    //     const minter_role = await game.MINTER_ROLE();
    //     const burner_role = await game.BURNER_ROLE();

    //     // transfer the lootbox contract ownership
    //     await lootbox.transferOwnership(developerWalletAddress);
        
    //     await game.grantRole(gc_manager_role, gcManagerAddress, {from:deployerAddress});
    //     await game.grantRole(minter_role, gcManagerAddress, {from:deployerAddress});
    //     await game.grantRole(burner_role, gcManagerAddress, {from:deployerAddress});
        
    //     // check to see if item manager address has the item manger role
    //     assert.equal(
    //         await game.hasRole(gc_manager_role, gcManagerAddress),
    //         true,
    //         "Item Manager Address didn't have the Item Manager Role"
    //     );

    //     // Add 5 items
    //     itemIds = [material1, material2, material3, reward1, reward2];
    //     await game.methods['createItemBatch(uint256[])'](itemIds, {from:gcManagerAddress});
        
    //     // Check if the new items were added.
    //     assert.equal(
    //         (await game.length()).toNumber(),
    //         5,
    //         "The 5 new items were not created"
    //     );
    // });
});