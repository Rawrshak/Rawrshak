const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Exchange Fees Escrow Contract tests', () => {
    var deployerAddress,
        executionManagerAddress,
        royaltiesManagerAddress,
        playerAddress,
        staker1,
        staker2;
    
    var rawrToken;
    var feesEscrow;
    var resolver;

    var staking;
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {
        [deployerAddress,
            executionManagerAddress,
            royaltiesManagerAddress,
            playerAddress,
            staker1,
            staker2
        ] = await ethers.getSigners();
        ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
        MockToken = await ethers.getContractFactory("MockToken");
        AddressResolver = await ethers.getContractFactory("AddressResolver");
        MockStaking = await ethers.getContractFactory("MockStaking");

        resolver = await upgrades.deployProxy(AddressResolver, []);
    });

    beforeEach(async () => {
        rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
        feesEscrow =  await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]);
        staking = await MockStaking.deploy(resolver.address);
    });

    async function setup() {
        // Register the execution manager
        await feesEscrow.registerManager(staking.address)
        
        // register the escrows
        await resolver.registerAddress(["0x1b48faca", "0x7f170836"], [staking.address, feesEscrow.address]);
    }

    describe("Basic Tests", () => {
    
        it('Check if ExchangeFeesEscrow was deployed properly', async () => {
            expect(feesEscrow.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Supports the ExchangeFeesEscrow Interface', async () => {
            // IExchangeFeesEscrow Interface
            expect(await feesEscrow.supportsInterface("0xeca651f3")).to.equal(true);

            // IEscrowBase Interface
            expect(await feesEscrow.supportsInterface("0xc7aacb62")).to.equal(true);

            // IAccessControlUpgradeable Interface
            expect(await feesEscrow.supportsInterface("0x7965db0b")).to.equal(true);
        });

        it('Deployer wallet must have default admin role', async () => {
            default_admin_role = await feesEscrow.DEFAULT_ADMIN_ROLE();
            expect(await feesEscrow.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
        });
    
        it('Registering Manager address', async () => {
            manager_role = await feesEscrow.MANAGER_ROLE();
            // Register the execution manager
            await expect(await feesEscrow.registerManager(executionManagerAddress.address))
                .to.emit(feesEscrow, 'ManagerRegistered');

            await expect(await feesEscrow.registerManager(royaltiesManagerAddress.address))
                .to.emit(feesEscrow, 'ManagerRegistered');
    
            expect(await feesEscrow.hasRole(manager_role, executionManagerAddress.address)).to.equal(true);
            
            expect(await feesEscrow.hasRole(manager_role, royaltiesManagerAddress.address)).to.equal(true);
        });
    });

    describe("Functional Tests", () => {
    
        it('Update Rate', async () => {
            await setup();
            
            expect(await feesEscrow.rate()).to.equal(0);
    
            // fails to set the rate because there are no tokens being staked
            await expect(feesEscrow.setRate(30000)).to.be.reverted;
            
            // add a staker
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));
    
            await expect(await feesEscrow.setRate(30000))
                .to.emit(feesEscrow, 'FeeUpdated');

            expect(await feesEscrow.rate()).to.equal(30000);
        });

        it('Deposit Royalties', async () => {
            await setup();
    
            await expect(await feesEscrow.depositFees(rawrToken.address, 10000))
                .to.emit(feesEscrow, 'ExchangeFeesPaid');
    
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(10000);
            
            await expect(await feesEscrow.depositFees(rawrToken.address, 5000))
                .to.emit(feesEscrow, 'ExchangeFeesPaid');
    
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(15000);
        });
        
        it('Deposit Multiple Token Royalties', async () => {
            await setup();
    
            // Create a 2nd token
            rawrV2Token = await upgrades.deployProxy(MockToken, ["Rawrshak Token V2", "RAWR2"]);
            await rawrV2Token.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
    
            // Give tokens to Player
            await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
            await rawrV2Token.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Deposit 10,000 of Rawr token fees
            await rawrToken.connect(playerAddress).transfer(feesEscrow.address, 10000);
            await expect(await feesEscrow.depositFees(rawrToken.address, 10000))
                .to.emit(feesEscrow, 'ExchangeFeesPaid');
            
            // Deposit 10,000 of RawrV2 token fees
            await rawrV2Token.connect(playerAddress).transfer(feesEscrow.address, 10000);
            await expect(await feesEscrow.depositFees(rawrV2Token.address, 10000))
                .to.emit(feesEscrow, 'ExchangeFeesPaid');
            
            // Check Escrow fees for both tokens
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(10000);
            expect(await feesEscrow.totalFees(rawrV2Token.address)).to.equal(10000);
        });
    });

    describe("Staking", () => {
        it('Stake tokens before Exchange Fees', async () => {
            await setup();

            await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));

            // add stakers - this calls staking().initializeTokenRate()
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));

            // Update internal deposits
            await expect(await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18)))
                .to.emit(feesEscrow, 'ExchangeFeesPaid');

            var p1claimable = await feesEscrow.getClaimableRewards(staker1.address);
            expect(p1claimable.length).to.equal(1);
            expect(p1claimable[0].token).to.equal(rawrToken.address);
            expect(p1claimable[0].amount).to.equal(ethers.BigNumber.from(10000).mul(_1e18));
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(10000).mul(_1e18));
        });

        it('Test claimable for 2 stakers', async () => {
            await setup();
    
            // add 2 stakers
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));
            await staking.connect(staker2).stake(ethers.BigNumber.from(75).mul(_1e18));
    
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18));
            
            var p1claimable = await feesEscrow.getClaimableRewards(staker1.address);
            expect(p1claimable[0].amount).to.equal(ethers.BigNumber.from(2500).mul(_1e18));
            
            var p2claimable = await feesEscrow.getClaimableRewards(staker2.address);
            expect(p2claimable[0].amount).to.equal(ethers.BigNumber.from(7500).mul(_1e18));
    
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(10000).mul(_1e18));
        });
        
        it('Test claimable for 2 stakers at different times', async () => {
            await setup();

            // add 2 stakers
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18));

            
            await staking.connect(staker2).stake(ethers.BigNumber.from(75).mul(_1e18));
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18));
            
            var p1claimable = await feesEscrow.getClaimableRewards(staker1.address);
            expect(p1claimable[0].amount).to.equal(ethers.BigNumber.from(12500).mul(_1e18));
            
            var p2claimable = await feesEscrow.getClaimableRewards(staker2.address);
            expect(p2claimable[0].amount).to.equal(ethers.BigNumber.from(7500).mul(_1e18));

            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));
        });
    });

    describe("Distribute and Claim", () => {

        it('Distribute Multiple Token Royalties', async () => {
            await setup();
    
            // Create a 2nd token
            rawrV2Token = await upgrades.deployProxy(MockToken, ["Rawrshak Token V2", "RAWR2"]);
            await rawrV2Token.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
    
            // Stakers
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));
            await staking.connect(staker2).stake(ethers.BigNumber.from(75).mul(_1e18));
    
            // Deposit 10,000 of Rawr token fees
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18));
            
            // Deposit 20,000 of RawrV2 token fees
            await feesEscrow.depositFees(rawrV2Token.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            var p1claimable = await feesEscrow.getClaimableRewards(staker1.address);
            expect(p1claimable.length).to.equal(2);
            expect(p1claimable[0].amount).to.equal(ethers.BigNumber.from(2500).mul(_1e18));
            expect(p1claimable[1].amount).to.equal(ethers.BigNumber.from(5000).mul(_1e18));
            
            var p2claimable = await feesEscrow.getClaimableRewards(staker2.address);
            expect(p2claimable.length).to.equal(2);
            expect(p2claimable[0].amount).to.equal(ethers.BigNumber.from(7500).mul(_1e18));
            expect(p2claimable[1].amount).to.equal(ethers.BigNumber.from(15000).mul(_1e18));
        });
        
        it('Claim Fees', async () => {
            await setup();

            await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));

            // add stakers - this calls staking().initializeTokenRate()
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));

            // Update internal deposits
            await rawrToken.connect(playerAddress).transfer(feesEscrow.address, ethers.BigNumber.from(20000).mul(_1e18));
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(20000).mul(_1e18));
            
            expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));

            // Note: the Staking contract will call UpdateUserRewards() before calling claimRewards()
            await feesEscrow.updateUserRewards(staker1.address);
            await feesEscrow.claimRewards(staker1.address);
            expect(await rawrToken.balanceOf(staker1.address)).to.equal(ethers.BigNumber.from(20000).mul(_1e18));
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(0);

            var p1claimable = await feesEscrow.getClaimableRewards(staker1.address);
            expect(p1claimable.length).to.equal(1);
            expect(p1claimable[0].amount).to.equal(0);
        });
        
        it('Claim Multiple Token Royalties', async () => {
            await setup();

            // Create a 2nd token
            rawrV2Token = await upgrades.deployProxy(MockToken, ["Rawrshak Token V2", "RAWR2"]);
            await rawrV2Token.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));

            await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
            await rawrV2Token.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));

            // Stakers
            await staking.connect(staker1).stake(ethers.BigNumber.from(25).mul(_1e18));

            // Deposit 10,000
            await rawrToken.connect(playerAddress).transfer(feesEscrow.address, 10000);
            await feesEscrow.depositFees(rawrToken.address, 10000);
            
            // Deposit 20,000
            await rawrV2Token.connect(playerAddress).transfer(feesEscrow.address, 20000);
            await feesEscrow.depositFees(rawrV2Token.address, 20000);

            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(10000);
            expect(await feesEscrow.totalFees(rawrV2Token.address)).to.equal(20000);

            // Note: the Staking contract will call UpdateUserRewards() before calling claimRewards()
            await feesEscrow.updateUserRewards(staker1.address);
            await feesEscrow.claimRewards(staker1.address);

            expect(await rawrToken.balanceOf(staker1.address)).to.equal(10000);
            expect(await rawrV2Token.balanceOf(staker1.address)).to.equal(20000);
        });
    });
});
