// const _deploy_contracts = require("../migrations/2_deploy_contracts");
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const RawrToken = artifacts.require("RawrToken");


contract('RAWR Token Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        minterAddress,              // address with minter capabilities
        burnerAddress,              // address with burner capabilities
        playerAddress,              // Player Address
        player2Address,             // Player Address
    ] = accounts;
    var rawrToken;
    var default_admin_role, minter_role, burner_role;

    // beforeEach(async () => {
    //     rawrToken = await RawrToken.new();
    //     await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
    //     console.log("Rawr Token Address: " + rawrToken.address);
    // });

    it

    it('Set up the Rawr Token Contract', async () => {
        // check balance of deployer address
        rawrToken = await deployProxy(RawrToken, [ web3.utils.toWei('1000000000', 'ether') ], {initializer: '__RawrToken_init'});
        console.log("Rawr Token Address: " + rawrToken.address);
        // console.log("Balance: " + balance.valueOf().toString());
        // assert.equal(balance.valueOf().toString(), web3.utils.toWei('1000000000', 'ether').toString(), "1000000000 wasn't in the first account");
    });

    
    it('Check balance of deployer address 1', async () => {
        // check balance of deployer address
        balance = await rawrToken.balanceOf(deployerAddress);

        console.log("Balance: " + web3.utils.fromWei(balance.valueOf(), 'ether').toString());
        assert.equal(balance.valueOf().toString(), web3.utils.toWei('1000000000', 'ether').toString(), "1000000000 wasn't in the first account");
    });


    // it('should put 1000000000 MetaCoin in the first account', async () => {
    //     rawrToken = await RawrToken.deployed();
    //     balance = await rawrToken.balanceOf(deployerAddress);

    //     assert.equal(balance.valueOf().toString(), web3.utils.toWei('1000000000', 'gwei').toString(), "1000000000 wasn't in the first account");
    // });

    // it('first account must have default admin role', async () => {
    //     default_admin_role = await rawrToken.DEFAULT_ADMIN_ROLE();
    //     minter_role = await rawrToken.MINTER_ROLE();
    //     burner_role = await rawrToken.BURNER_ROLE();

    //     assert.equal(
    //         await rawrToken.hasRole(
    //             default_admin_role,
    //             deployerAddress),
    //         true, "first account didn't have admin role");
    // });
  
    // it('transfer balance from account 0 to account 1', async () => {
    //     // transfer tokens
    //     await rawrToken.transfer(playerAddress, web3.utils.toWei('5000', 'gwei'), {from: deployerAddress});

    //     // check balances
    //     assert.equal((await rawrToken.balanceOf(deployerAddress)).toString(), web3.utils.toWei('999995000', 'gwei').toString(), "999995000 wasn't in account 0");
    //     assert.equal((await rawrToken.balanceOf(playerAddress)).toString(), web3.utils.toWei('5000', 'gwei').toString(), "5000 wasn't in account 1");
    // });
    
    // it('admin grants account 1 and 2 minter and burner roles', async () => {
    //     // account 0 grants account 1 a role
    //     await rawrToken.grantRole(minter_role, minterAddress, {from:deployerAddress});
        
    //     // account 0 grants account 2 a role
    //     await rawrToken.grantRole(burner_role, burnerAddress, {from:deployerAddress});

    //     // check to see if account 1 is the minter role
    //     assert.equal(
    //         await rawrToken.hasRole(
    //             minter_role,
    //             minterAddress),
    //         true, "account 1 didn't have the minter role");

    //     // check to see if account 1 is the burner role
    //     assert.equal(
    //         await rawrToken.hasRole(
    //             burner_role,
    //             burnerAddress),
    //         true, "account 2 didn't have the burner role");
    // });
    
    // it('mint and burn tokens', async () => {
    //     const currentTotalSupply = web3.utils.toBN(await rawrToken.totalSupply());
    //     const newSupply = web3.utils.toWei('10000', 'gwei');
    //     const newTotalSupply = web3.utils.toWei('1000010000', 'gwei');

    //     // mint new tokens by account 1
    //     await rawrToken.mint(player2Address, newSupply, {from:minterAddress});
    //     assert.equal(
    //         (await rawrToken.balanceOf(player2Address)).toString(),
    //         newSupply.toString(), 
    //         "Account 3 was not given the new tokens.");
    //     assert.equal(
    //         (await rawrToken.totalSupply()).toString(), 
    //         newTotalSupply.toString(),
    //         "Total Supply has not increased.");

    //     // burn new tokens by account 2
    //     await rawrToken.burn(player2Address, newSupply, {from:burnerAddress});
    //     assert.equal(
    //         (await rawrToken.balanceOf(player2Address)).toString(),
    //         0, 
    //         "Account 3 was not given the new tokens.");
    //     assert.equal(
    //         (await rawrToken.totalSupply()).toString(), 
    //         currentTotalSupply.toString(), 
    //         "Total Supply has not increased.");
    // });
});
