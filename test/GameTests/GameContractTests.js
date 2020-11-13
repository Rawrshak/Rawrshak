const _deploy_contracts = require("../../migrations/2_deploy_contracts");
const GameContract = artifacts.require("GameContract");

contract('Game Contract', (accounts) => {
    it('Check Default Admin Role', async () => {
        const gameContract = await GameContract.deployed();
        const default_admin_role = await gameContract.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await gameContract.hasRole(
                default_admin_role,
                accounts[0]),
            true, "Deployer address is not the default admin role");
    });

    it('Check Game Payable Address', async () => {
        const gameContract = await GameContract.deployed();
        const gameOwnerAddress = await gameContract.getGamePayableAddress();

        assert.equal(gameOwnerAddress, accounts[0], "Deployer address is not the owner of the contract.");
    });

    it('Set Game Payable Address', async () => {
        const gameContract = await GameContract.deployed();
        const deployerAddress = accounts[0];
        const newOwnerAddress = accounts[1];

        await gameContract.setGamePayableAddress(newOwnerAddress, {from:deployerAddress});
        const gameOwnerAddress = await gameContract.getGamePayableAddress();

        assert.equal(gameOwnerAddress, newOwnerAddress, "Game Owner Address was not updated.");
    });

    it('Set Minter and Burner Roles', async () => {
        const gameContract = await GameContract.deployed();
        const default_admin_role = await gameContract.DEFAULT_ADMIN_ROLE();
        const minter_role = await gameContract.MINTER_ROLE();
        const burner_role = await gameContract.BURNER_ROLE();
        const deployerAddress = accounts[0];
        const minterAddress = accounts[2];
        const burnerAddress = accounts[3];

        // check to see if first account is the admin role
        assert.equal(
            await gameContract.hasRole(
                default_admin_role,
                deployerAddress),
            true, "first account didn't have admin role");

        // account 0 grants account 1 a role
        await gameContract.grantRole(minter_role, minterAddress, {from:deployerAddress});
        
        // account 0 grants account 2 a role
        await gameContract.grantRole(burner_role, burnerAddress, {from:deployerAddress});

        // check to see if account 1 is the minter role
        assert.equal(
            await gameContract.hasRole(
                minter_role,
                minterAddress),
            true, "account 1 didn't have the minter role");

        // check to see if account 1 is the burner role
        assert.equal(
            await gameContract.hasRole(
                burner_role,
                burnerAddress),
            true, "account 2 didn't have the burner role");
    });
});