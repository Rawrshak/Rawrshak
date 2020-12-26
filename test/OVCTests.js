const _deploy_contracts = require("../migrations/2_deploy_contracts");
const OvcTokenContract = artifacts.require("OVCToken");

contract('OVC Token Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        minterAddress,              // address with minter capabilities
        burnerAddress,              // address with burner capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var ovcToken;
    var default_admin_role, minter_role, burner_role;


    it('should put 1000000000 MetaCoin in the first account', async () => {
        ovcToken = await OvcTokenContract.deployed();
        balance = await ovcToken.balanceOf(deployerAddress);

        assert.equal(balance.valueOf(), 1000000000, "1000000000 wasn't in the first account");
    });

    it('first account must have default admin role', async () => {
        default_admin_role = await ovcToken.DEFAULT_ADMIN_ROLE();
        minter_role = await ovcToken.MINTER_ROLE();
        burner_role = await ovcToken.BURNER_ROLE();

        assert.equal(
            await ovcToken.hasRole(
                default_admin_role,
                deployerAddress),
            true, "first account didn't have admin role");
    });
  
    it('transfer balance from account 0 to account 1', async () => {
        // transfer tokens
        await ovcToken.transfer(playerAddress, 5000, {from: deployerAddress});

        // check balances
        assert.equal((await ovcToken.balanceOf(deployerAddress)).toNumber(), 999995000, "999995000 wasn't in account 0");
        assert.equal((await ovcToken.balanceOf(playerAddress)).toNumber(), 5000, "5000 wasn't in account 1");
    });
    
    it('admin grants account 1 and 2 minter and burner roles', async () => {
        // account 0 grants account 1 a role
        await ovcToken.grantRole(minter_role, minterAddress, {from:deployerAddress});
        
        // account 0 grants account 2 a role
        await ovcToken.grantRole(burner_role, burnerAddress, {from:deployerAddress});

        // check to see if account 1 is the minter role
        assert.equal(
            await ovcToken.hasRole(
                minter_role,
                minterAddress),
            true, "account 1 didn't have the minter role");

        // check to see if account 1 is the burner role
        assert.equal(
            await ovcToken.hasRole(
                burner_role,
                burnerAddress),
            true, "account 2 didn't have the burner role");
    });
    
    it('mint and burn tokens', async () => {
        const totalSupply = (await ovcToken.totalSupply()).toNumber();
        const newSupply = 10000;

        // mint new tokens by account 1
        await ovcToken.mint(player2Address, newSupply, {from:minterAddress});
        assert.equal(
            (await ovcToken.balanceOf(player2Address)).toNumber(),
            newSupply, 
            "Account 3 was not given the new tokens.");
        assert.equal(
            (await ovcToken.totalSupply()).toNumber(), 
            totalSupply + newSupply, 
            "Total Supply has not increased.");

        // burn new tokens by account 2
        await ovcToken.burn(player2Address, newSupply, {from:burnerAddress});
        assert.equal(
            (await ovcToken.balanceOf(player2Address)).toNumber(),
            0, 
            "Account 3 was not given the new tokens.");
        assert.equal(
            (await ovcToken.totalSupply()).toNumber(), 
            totalSupply, 
            "Total Supply has not increased.");
    });
});
