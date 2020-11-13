const _deploy_contracts = require("../migrations/2_deploy_contracts");
const OvcTokenContract = artifacts.require("OVCToken");

contract('OVC Token Contract', (accounts) => {
  it('should put 1000000000 MetaCoin in the first account', async () => {
    const contract = await OvcTokenContract.deployed();
    const balance = await contract.balanceOf(accounts[0]);

    assert.equal(balance.valueOf(), 1000000000, "1000000000 wasn't in the first account");
  });

  it('first account must have default admin role', async () => {
    const contract = await OvcTokenContract.deployed();
    const default_admin_role = await contract.DEFAULT_ADMIN_ROLE();

    assert.equal(
        await contract.hasRole(
            default_admin_role,
            accounts[0]),
        true, "first account didn't have admin role");
  });
  
  it('transfer balance from account 0 to account 1', async () => {
    const contract = await OvcTokenContract.deployed();
    assert.equal((await contract.balanceOf(accounts[0])).toNumber(), 1000000000, "1000000000 wasn't in the first account");

    // transfer tokens
    await contract.transfer(accounts[1], 5000, {from: accounts[0]});

    // check balances
    assert.equal((await contract.balanceOf(accounts[0])).toNumber(), 999995000, "999995000 wasn't in account 0");
    assert.equal((await contract.balanceOf(accounts[1])).toNumber(), 5000, "5000 wasn't in account 1");
  });
  
  it('admin grants account 1 a role', async () => {
    const contract = await OvcTokenContract.deployed();
    const default_admin_role = await contract.DEFAULT_ADMIN_ROLE();
    const minter_role = await contract.MINTER_ROLE();

    // check to see if first account is the admin role
    assert.equal(
        await contract.hasRole(
            default_admin_role,
            accounts[0]),
        true, "first account didn't have admin role");

    // account 0 grants account 1 a role
    await contract.grantRole(minter_role, accounts[1], {from:accounts[0]});
    
    // check to see if account 1 is the minter role
    assert.equal(
        await contract.hasRole(
            minter_role,
            accounts[1]),
        true, "account 1 didn't have the minter role");
  });
});
