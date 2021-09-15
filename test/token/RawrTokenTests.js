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

    beforeEach(async () => {
        rawrToken = await RawrToken.new();
        await rawrToken.__RawrToken_init(web3.utils.toWei('1000000000', 'ether'), {from: deployerAddress});
        // console.log("Rawr Token Address: " + rawrToken.address);
    });

    it('Check if correct amount of tokens was minted', async () => {
        // check balance of deployer address
        balance = await rawrToken.balanceOf(deployerAddress);

        // console.log("Balance: " + web3.utils.fromWei(balance.valueOf(), 'ether').toString());
        assert.equal(
            balance.valueOf().toString(),
            web3.utils.toWei('1000000000', 'ether').toString(),
            "1000000000 wasn't in the deployer wallet");
    });

    it('Supports the TokenBase Interface', async () => {
        // INTERFACE_ID_TOKENBASE = 0x00000004
        assert.equal(
            await rawrToken.supportsInterface("0x00000004"),
            true, 
            "the token doesn't support the TokenBase interface");
    });

    it('Deployer wallet must have default admin role', async () => {
        var default_admin_role = await rawrToken.DEFAULT_ADMIN_ROLE();

        assert.equal(
            await rawrToken.hasRole(
                default_admin_role,
                deployerAddress),
            true, 
            "deployer wallet didn't have admin role");
    });

    it('Deployer wallet must not minter and burner roles', async () => {
        var minter_role = await rawrToken.MINTER_ROLE();
        var burner_role = await rawrToken.BURNER_ROLE();

        assert.equal(
            await rawrToken.hasRole(
                minter_role,
                deployerAddress),
            false, 
            "deployer wallet shouldn't have minter role");

        assert.equal(
            await rawrToken.hasRole(
                burner_role,
                deployerAddress),
            false, 
            "deployer wallet shouldn't have burner role");
    });
    
    it('Admin grants minter wallet and burner wallet the minter and burner roles', async () => {
        var minter_role = await rawrToken.MINTER_ROLE();
        var burner_role = await rawrToken.BURNER_ROLE();

        // deployer address grants minter wallet a role
        await rawrToken.grantRole(minter_role, minterAddress, {from:deployerAddress});
        
        // deployer address grants burner wallet a role
        await rawrToken.grantRole(burner_role, burnerAddress, {from:deployerAddress});

        // check to see if minter wallet is the minter role
        assert.equal(
            await rawrToken.hasRole(
                minter_role,
                minterAddress),
            true, "minter wallet didn't have the minter role");

        // check to see if burner wallet is the burner role
        assert.equal(
            await rawrToken.hasRole(
                burner_role,
                burnerAddress),
            true, "burner wallet didn't have the burner role");
    });
  
    it('Transfer balance from deployer wallet to player wallet', async () => {
        // transfer tokens
        await rawrToken.transfer(playerAddress, web3.utils.toWei('5000', 'ether'), {from: deployerAddress});

        // check balances
        assert.equal((await rawrToken.balanceOf(deployerAddress)).toString(), web3.utils.toWei('999995000', 'ether').toString(), "999995000 wasn't in deployer wallet");
        assert.equal((await rawrToken.balanceOf(playerAddress)).toString(), web3.utils.toWei('5000', 'ether').toString(), "5000 wasn't in player wallet");
    });
        
    it('mint tokens', async () => {
        // const currentTotalSupply = web3.utils.toBN(await rawrToken.totalSupply());
        const newSupply = web3.utils.toWei('10000', 'ether');
        const newTotalSupply = web3.utils.toWei('1000010000', 'ether');

        // give minter address minter role
        var minter_role = await rawrToken.MINTER_ROLE();
        await rawrToken.grantRole(minter_role, minterAddress, {from:deployerAddress});

        // mint new tokens by deployer and send to player 2
        await rawrToken.mint(player2Address, newSupply, {from:minterAddress});
        assert.equal(
            (await rawrToken.balanceOf(player2Address)).toString(),
            newSupply.toString(), 
            "Player 2 was not given the new tokens.");
        assert.equal(
            (await rawrToken.totalSupply()).toString(), 
            newTotalSupply.toString(),
            "Total Supply has not increased.");
    });
    
    it('burn tokens', async () => {
        // const currentTotalSupply = web3.utils.toBN(await rawrToken.totalSupply());
        const burnSupply = web3.utils.toWei('10000', 'ether');
        const newTotalSupply = web3.utils.toWei('999990000', 'ether');
        
        // give burner address burner role
        var burner_role = await rawrToken.BURNER_ROLE();
        await rawrToken.grantRole(burner_role, burnerAddress, {from:deployerAddress});

        // burn new tokens by account 2
        await rawrToken.burn(deployerAddress, burnSupply, {from:burnerAddress});
        assert.equal(
            (await rawrToken.balanceOf(deployerAddress)).toString(),
            newTotalSupply.toString(), 
            "Deployer's tokens were not burned");
        assert.equal(
            (await rawrToken.totalSupply()).toString(), 
            newTotalSupply.toString(), 
            "Total Supply has not decreased.");
    });
});
