const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('ERC20 Escrow Contract tests', () => {
    var deployerAddress,
        executionManagerAddress,
        royaltiesManagerAddress,
        platformFeesPoolAddress,
        playerAddress,
        player2Address,
        creatorAddress;

    var rawrToken;
    var escrow;
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {
        [deployerAddress,
            executionManagerAddress,
            royaltiesManagerAddress,
            platformFeesPoolAddress,
            playerAddress,
            player2Address,
            creatorAddress
        ] = await ethers.getSigners();
        Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
        MockToken = await ethers.getContractFactory("MockToken");
    });

    beforeEach(async () => {
        escrow = await upgrades.deployProxy(Erc20Escrow, []);
    });

    async function setup() {
        rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));

        // Register the execution manager
        await escrow.registerManager(executionManagerAddress.address);

        // add token support
        await escrow.connect(executionManagerAddress).addSupportedTokens(rawrToken.address);

        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
    }

    describe("Basic Tests", () => {
        it('Check if Erc20Escrow was deployed properly', async () => {
            expect(escrow.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Supports the Erc20Escrow Interface', async () => {
            // IErc20Escrow Interface
            expect(await escrow.supportsInterface("0xfeb2d5c7")).to.equal(true);

            // IEscrowBase Interface
            expect(await escrow.supportsInterface("0xc7aacb62")).to.equal(true);

            // IAccessControlUpgradeable Interface
            expect(await escrow.supportsInterface("0x7965db0b")).to.equal(true);
        });
    
        it('Deployer wallet must have default admin role', async () => {
            var default_admin_role = await escrow.DEFAULT_ADMIN_ROLE();
            expect(await escrow.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
        });
    
        it('Deployer wallet must not have manager role', async () => {
            var manager_role = await escrow.MANAGER_ROLE();
            expect(await escrow.hasRole(manager_role, deployerAddress.address)).to.equal(false);
        });
        
        it('Registering Manager address', async () => {
            var manager_role = await escrow.MANAGER_ROLE();
            await expect(await escrow.registerManager(royaltiesManagerAddress.address))
                .to.emit(escrow, 'ManagerRegistered');

            expect(await escrow.hasRole(manager_role, executionManagerAddress.address)).to.equal(false);
            expect(await escrow.hasRole(manager_role, royaltiesManagerAddress.address)).to.equal(true);
        });
    });
    
    describe("User transactions", () => {
        it('Deposit 10000 RAWR tokens from player 1', async () => {
            await setup();
    
            // Allow rawr tokens to be escrowed
            var tokenAmount = ethers.BigNumber.from(10000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
    
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, tokenAmount);
    
            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(tokenAmount);
            expect(await rawrToken.balanceOf(escrow.address)).to.equal(tokenAmount);
        });
        
        it('Withdraw 10000 RAWR tokens from player address', async () => {
            await setup();
    
            // Allow rawr tokens to be escrowed
            var tokenAmount = ethers.BigNumber.from(10000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
            
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, tokenAmount);
    
            // After moving assets to the escrow
            expect(await rawrToken.balanceOf(escrow.address)).to.equal(tokenAmount);
    
            await escrow.connect(executionManagerAddress).withdraw(1, playerAddress.address, tokenAmount);
    
            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(0);
            expect(await rawrToken.balanceOf(escrow.address)).to.equal(0);
            expect(await rawrToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));
        });
        
        it('Withdraw 10000 RAWR tokens from player address in 2 transactions', async () => {
            await setup();
    
            // Allow rawr tokens to be escrowed
            var tokenAmount = ethers.BigNumber.from(10000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, tokenAmount);
    
            await escrow.connect(executionManagerAddress).withdraw(1, playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
            await escrow.connect(executionManagerAddress).withdraw(1, playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
    
            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(0);
            expect(await rawrToken.balanceOf(escrow.address)).to.equal(0);
            expect(await rawrToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));
        });
    
        it('Invalid Withdraw', async () => {
            await setup();
    
            // Allow rawr tokens to be escrowed
            var tokenAmount = ethers.BigNumber.from(5000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, tokenAmount);
    
            await expect(escrow.connect(executionManagerAddress).withdraw(1, playerAddress, web3.utils.toWei('10000', 'ether'))).to.be.reverted;

            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(tokenAmount);
        });
    });
    
    describe("Royalty transactions", () => {

        it('Deposit Royalty', async () => {
            await setup();

            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(10000).mul(_1e18));
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));

            await escrow.connect(executionManagerAddress)['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress.address, creatorAddress.address, ethers.BigNumber.from(5000).mul(_1e18));

            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
            
            // check claimable tokens for player 1
            var claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.tokens[0]).to.equal(rawrToken.address);
            expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
        });

        it('Transfer Royalty from escrow to claimable', async () => {
            await setup();
            
            var tokenAmount = ethers.BigNumber.from(5000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, tokenAmount);

            await escrow.connect(executionManagerAddress)['transferRoyalty(uint256,address,uint256)'](1, creatorAddress.address, ethers.BigNumber.from(1000).mul(_1e18));
            
            // check escrowed tokens by order (1)
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(4000).mul(_1e18));

            // check claimable tokens for player 1
            var claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(1000).mul(_1e18));
        });

        it('Claim Royalty', async () => {
            await setup();
            var tokenAmount = ethers.BigNumber.from(5000).mul(_1e18);
            await rawrToken.connect(playerAddress).approve(escrow.address, tokenAmount);
            await escrow.connect(executionManagerAddress)['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress.address, creatorAddress.address, ethers.BigNumber.from(5000).mul(_1e18));

            var claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(5000).mul(_1e18));

            await escrow.connect(executionManagerAddress).claimRoyalties(creatorAddress.address);

            claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts.length).to.equal(0);
            expect(await rawrToken.balanceOf(creatorAddress.address)).to.equal(tokenAmount);
        });

        it('Deposit and claim royalties with multiple different token pools', async () => {
            await setup();

            // Set up second token
            rawrToken2 = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
            await rawrToken2.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));

            // add token support
            await escrow.connect(executionManagerAddress).addSupportedTokens(rawrToken2.address);

            // Give player 1 20000 RAWR tokens
            await rawrToken2.connect(deployerAddress).transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));

            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(5000).mul(_1e18));
            await rawrToken2.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(5000).mul(_1e18));

            // Deposit Royalty
            await escrow.connect(executionManagerAddress)['transferRoyalty(address,address,address,uint256)'](rawrToken.address, playerAddress.address, creatorAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
            await escrow.connect(executionManagerAddress)['transferRoyalty(address,address,address,uint256)'](rawrToken2.address, playerAddress.address, creatorAddress.address, ethers.BigNumber.from(5000).mul(_1e18));

            // Checked claimable tokens for player 1
            claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.tokens[0]).to.equal(rawrToken.address);
            expect(claimable.tokens[1]).to.equal(rawrToken2.address);

            // Creator claims
            await escrow.connect(executionManagerAddress).claimRoyalties(creatorAddress.address);
            
            claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts.length).to.equal(0);

            // Check balance
            expect(await rawrToken.balanceOf(creatorAddress.address)).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
            expect(await rawrToken.balanceOf(creatorAddress.address)).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
        });

        it('Deposit and Transfer platform fees', async () => {
            await setup();
            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(10000).mul(_1e18));
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
            
            // deposit platform fee
            await escrow.connect(executionManagerAddress)['transferPlatformFee(address,address,address,uint256)'](rawrToken.address, playerAddress.address, platformFeesPoolAddress.address, ethers.BigNumber.from(5000).mul(_1e18));

            // check platform fees pool balance
            expect(await rawrToken.balanceOf(platformFeesPoolAddress.address)).to.equal(ethers.BigNumber.from(5000).mul(_1e18));

            // transfer platform fee
            await escrow.connect(executionManagerAddress)['transferPlatformFee(uint256,address,uint256)'](1, platformFeesPoolAddress.address, ethers.BigNumber.from(1000).mul(_1e18));

            // check platform fees pool balance
            expect(await rawrToken.balanceOf(platformFeesPoolAddress.address)).to.equal(ethers.BigNumber.from(6000).mul(_1e18));
            
            // check platform fees pool balance
            expect(await rawrToken.balanceOf(escrow.address)).to.equal(ethers.BigNumber.from(4000).mul(_1e18));
        });
    });

    describe("End-to-End", () => {
        it('Place Order and Fill Order', async () => {
            await setup();
            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(5000).mul(_1e18));
            await escrow.connect(executionManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, ethers.BigNumber.from(5000).mul(_1e18));
    
            await escrow.connect(executionManagerAddress)['transferRoyalty(uint256,address,uint256)'](1, creatorAddress.address, ethers.BigNumber.from(1000).mul(_1e18));

            await escrow.connect(executionManagerAddress).withdraw(1, player2Address.address, ethers.BigNumber.from(4000).mul(_1e18));
    
            await escrow.connect(executionManagerAddress).claimRoyalties(creatorAddress.address);
    
            // Check escrowed tokens for Order 1
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(0);
    
            // Checked claimable tokens for player 1
            claimable = await escrow.claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts.length).to.equal(0);
        });
    });
});
