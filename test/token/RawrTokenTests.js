const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('RAWR Token Contract', () => {
    var rawrToken;
    var deployerAddress, minterAddress, burnerAddress, playerAddress, player2Address;
    var _1e18;

    before(async () => {
        [deployerAddress, minterAddress, burnerAddress, playerAddress, player2Address] = await ethers.getSigners();
        RawrToken = await ethers.getContractFactory("RawrToken");
        _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));
    });

    beforeEach(async () => {
        rawrToken = await upgrades.deployProxy(RawrToken, [ethers.BigNumber.from(100000000).mul(_1e18)]);
    });

    describe("Basic Tests", () => {
        it('Check if correct amount of tokens was minted', async () => {
            // check balance of deployer address
            balance = await rawrToken.balanceOf(deployerAddress.address);
            expect(balance).to.equal(ethers.BigNumber.from('10').pow(ethers.BigNumber.from('26')));
        });
        
        it('Supports the TokenBase Interface', async () => {
            // INTERFACE_ID_TOKENBASE = 0x00000004
            expect(await rawrToken.supportsInterface("0x00000004")).to.equal(true);
        });

        it('Deployer wallet must have default admin role', async () => {
            var default_admin_role = await rawrToken.DEFAULT_ADMIN_ROLE();

            expect(await rawrToken.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
        });

        it('Deployer wallet must not minter and burner roles', async () => {
            var minter_role = await rawrToken.MINTER_ROLE();
            var burner_role = await rawrToken.BURNER_ROLE();

            expect(await rawrToken.hasRole(minter_role, deployerAddress.address)).to.equal(false);
            expect(await rawrToken.hasRole(burner_role, deployerAddress.address)).to.equal(false);
        });
        
        it('Admin grants minter wallet and burner wallet the minter and burner roles', async () => {
            var minter_role = await rawrToken.MINTER_ROLE();
            var burner_role = await rawrToken.BURNER_ROLE();

            // deployer address grants minter wallet a role
            await rawrToken.grantRole(minter_role, minterAddress.address);
            
            // deployer address grants burner wallet a role
            await rawrToken.grantRole(burner_role, burnerAddress.address);

            // check to see if minter wallet is the minter role
            expect(await rawrToken.hasRole(minter_role, minterAddress.address)).to.equal(true);
            expect(await rawrToken.hasRole(burner_role, burnerAddress.address)).to.equal(true);
        });
    });

    describe("Token transactions", () => {
        it('Transfer balance from deployer wallet to player wallet', async () => {
            // transfer tokens
            await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
    
            // check balances
            expect(await rawrToken.balanceOf(deployerAddress.address)).to.equal(ethers.BigNumber.from(99995000).mul(_1e18));
            expect(await rawrToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
        });
            
        it('mint tokens', async () => {
            const newSupply = ethers.BigNumber.from(10000).mul(_1e18);
            const newTotalSupply = ethers.BigNumber.from(100010000).mul(_1e18);
    
            // give minter address minter role
            var minter_role = await rawrToken.MINTER_ROLE();
            await rawrToken.grantRole(minter_role, minterAddress.address);
    
            // mint new tokens by deployer and send to player 2
            await rawrToken.connect(minterAddress).mint(player2Address.address, newSupply);
            expect(await rawrToken.balanceOf(player2Address.address)).to.equal(newSupply);
            expect(await rawrToken.totalSupply()).to.equal(newTotalSupply);
        });
        
        it('burn tokens', async () => {
            const burnSupply = ethers.BigNumber.from(10000).mul(_1e18);
            const newTotalSupply = ethers.BigNumber.from(99990000).mul(_1e18);
            
            // give burner address burner role
            var burner_role = await rawrToken.BURNER_ROLE();
            await rawrToken.grantRole(burner_role, burnerAddress.address);
    
            // burn new tokens by account 2
            await rawrToken.connect(burnerAddress).burn(deployerAddress.address, burnSupply);
            expect(await rawrToken.balanceOf(deployerAddress.address)).to.equal(newTotalSupply);
            expect(await rawrToken.totalSupply()).to.equal(newTotalSupply);
        });
    });
});
