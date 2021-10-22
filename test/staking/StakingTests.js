const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Staking Rewards Pool Contract Tests', () => {
    var deployerAddress,
        playerAddress,
        player2Address,
        staker1,
        staker2;

    var rawrToken;
    var feesEscrow;
    var resolver;
    var staking;
    
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {            
        [deployerAddress,
            playerAddress,
            player2Address,
            staker1,
            staker2
        ] = await ethers.getSigners();
        
        ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
        MockToken = await ethers.getContractFactory("MockToken");
        AddressResolver = await ethers.getContractFactory("AddressResolver");
        Staking = await ethers.getContractFactory("Staking");

        resolver = await upgrades.deployProxy(AddressResolver, []);
    });

    beforeEach(async () => {
        rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
        feesEscrow = await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]);
        staking = await upgrades.deployProxy(Staking, [rawrToken.address, resolver.address]);
    });

    async function setup() {
        // Register Staking as a manager for the rewards pools
        await feesEscrow.registerManager(staking.address);

        // register the escrows
        await resolver.registerAddress(["0x1b48faca", "0x7f170836"], [staking.address, feesEscrow.address]);
        
        // Give token to player
        await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
    }

    describe("Basic Tests", () => {
        it('Supports the Staking Interface', async () => {
            // IStaking Interface
            expect(await staking.supportsInterface("0x09891775")).to.equal(true);
        });
    
        it('Check Default variables', async () => {
            expect(await staking.totalStakedTokens()).to.equal(0);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(0);
            expect(await staking.userStakedAmount(player2Address.address)).to.equal(0);
            expect(await staking.token()).to.equal(rawrToken.address);
        });
    });

    describe("Staking", () => {
        it('Single Staker', async () => {
            await setup();
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await staking.connect(playerAddress).stake(10000);

            expect(await staking.totalStakedTokens()).to.equal(10000);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(10000);
    
            var claimable = await staking.connect(playerAddress).getUserClaimableExchangeRewards(playerAddress.address);
            expect(claimable.length).to.equal(0);
        });
    
        it('Multiple Stakers', async () => {
            await setup();
            // Give token to player
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await rawrToken.connect(player2Address).approve(staking.address, 20000);
            await staking.connect(playerAddress).stake(10000);
            await staking.connect(player2Address).stake(20000);
    
            expect(await staking.totalStakedTokens()).to.equal(30000);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(10000);
            expect(await staking.userStakedAmount(player2Address.address)).to.equal(20000);
            
            var claimable = await staking.connect(playerAddress).getUserClaimableExchangeRewards(playerAddress.address);
            expect(claimable.length).to.equal(0);
        });
    });

    describe("Staking and Withdraw", () => {

        it('Multiple Stakers, Single Withdraw', async () => {
            await setup();
            // Give token to player
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await rawrToken.connect(player2Address).approve(staking.address, 20000);
            await staking.connect(playerAddress).stake(10000);
            await staking.connect(player2Address).stake(20000);
    
            expect(await staking.totalStakedTokens()).to.equal(30000);
            await staking.connect(player2Address).withdraw(10000);
    
            expect(await staking.totalStakedTokens()).to.equal(20000);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(10000);
            expect(await staking.userStakedAmount(player2Address.address)).to.equal(10000);
        });
    
        it('Multiple Stakers, Multiple Withdraw', async () => {
            await setup();
            // Give token to player
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await rawrToken.connect(player2Address).approve(staking.address, 20000);
            await staking.connect(playerAddress).stake(10000);
            await staking.connect(player2Address).stake(20000);
    
            expect(await staking.totalStakedTokens()).to.equal(30000);
            await staking.connect(player2Address).withdraw(10000);
    
            expect(await staking.totalStakedTokens()).to.equal(20000);
            
            await staking.connect(playerAddress).withdraw(5000);
            await staking.connect(player2Address).withdraw(5000);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(5000);
            expect(await staking.userStakedAmount(player2Address.address)).to.equal(5000);
        });
    
        it('Multiple Staker, Single Exit', async () => {
            await setup();
            // Give token to player
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
            
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await rawrToken.connect(player2Address).approve(staking.address, 20000);
            await staking.connect(playerAddress).stake(10000);
            await staking.connect(player2Address).stake(20000);
    
            expect(await staking.totalStakedTokens()).to.equal(30000);
            await staking.connect(player2Address).exit();
    
            expect(await staking.totalStakedTokens()).to.equal(10000);
            expect(await staking.userStakedAmount(player2Address.address)).to.equal(0);
        });

    });

    describe("Staking and Claim", () => {

        it('Single Staker with Claim', async () => {
            await setup();
    
            // Give token to player
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(playerAddress).approve(staking.address, 10000);
            await staking.connect(playerAddress).stake(10000);
    
            expect(await staking.totalStakedTokens()).to.equal(10000);
            expect(await staking.userStakedAmount(playerAddress.address)).to.equal(10000);
    
            // Update internal deposits
            await rawrToken.connect(player2Address).transfer(feesEscrow.address, ethers.BigNumber.from(100).mul(_1e18));
            await feesEscrow.depositFees(rawrToken.address, ethers.BigNumber.from(100).mul(_1e18));
    
            var claimable = await staking.connect(playerAddress).getUserClaimableExchangeRewards(playerAddress.address);
            expect(claimable.length).to.equal(1);
            expect(claimable[0].amount).to.equal(ethers.BigNumber.from(100).mul(_1e18));
    
            await staking.connect(playerAddress).claimRewards();

            expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(0);
        });
    
        it('Multiple Staker with Single Claim', async () => {
            await setup();
    
            // Give token to player
            await rawrToken.transfer(staker1.address, 25);
            await rawrToken.transfer(staker2.address, 75);
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(staker1).approve(staking.address, 25);
            await rawrToken.connect(staker2).approve(staking.address, 75);
            await staking.connect(staker1).stake(25);
            await staking.connect(staker2).stake(75);
    
            expect(await staking.totalStakedTokens()).to.equal(100);
    
            // Update internal deposits
            await rawrToken.connect(player2Address).transfer(feesEscrow.address, 1000);
            await feesEscrow.depositFees(rawrToken.address, 1000);
    
            await staking.connect(staker1).claimRewards();
    
            expect(await rawrToken.balanceOf(staker1.address)).to.equal(250);
        });
    
        it('Multiple Staker with Multiple rewards and single claim', async () => {
            await setup();
    
            // Give token to player
            await rawrToken.transfer(staker1.address, 25);
            await rawrToken.transfer(staker2.address, 75);
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(staker1).approve(staking.address, 25);
            await rawrToken.connect(staker2).approve(staking.address, 75);
            await staking.connect(staker1).stake(25);
            await staking.connect(staker2).stake(75);
            
            expect(await staking.totalStakedTokens()).to.equal(100);
    
            // Update internal deposits
            await rawrToken.connect(player2Address).transfer(feesEscrow.address, 1000);
            await feesEscrow.depositFees(rawrToken.address, 1000);
    
            await rawrToken.connect(playerAddress).transfer(feesEscrow.address, 4000);
            await feesEscrow.depositFees(rawrToken.address, 4000);
    
            await staking.connect(staker1).claimRewards();
    
            expect(await rawrToken.balanceOf(staker1.address)).to.equal(1250);
        });
    
        it('Multiple Staker with Multiple rewards and multiple claims', async () => {
            await setup();
    
            // Give token to player
            await rawrToken.transfer(staker1.address, 25);
            await rawrToken.transfer(staker2.address, 75);
            await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(20000).mul(_1e18));
    
            // Player 1 is Staking 10000 tokens (in wei)
            await rawrToken.connect(staker1).approve(staking.address, 25);
            await rawrToken.connect(staker2).approve(staking.address, 75);
            await staking.connect(staker1).stake(25);
            await staking.connect(staker2).stake(75);
    
            expect(await staking.totalStakedTokens()).to.equal(100);
    
            // Update internal deposits
            await rawrToken.connect(player2Address).transfer(feesEscrow.address, 1000);
            await feesEscrow.depositFees(rawrToken.address, 1000);
    
            await staking.connect(staker1).claimRewards();
            expect(await rawrToken.balanceOf(staker1.address)).to.equal(250);
            
            await rawrToken.connect(playerAddress).transfer(feesEscrow.address, 4000);
            await feesEscrow.depositFees(rawrToken.address, 4000);
    
            await staking.connect(staker1).claimRewards();
            expect(await rawrToken.balanceOf(staker1.address)).to.equal(1250);
    
            var claimable = await staking.connect(staker2).getUserClaimableExchangeRewards(staker2.address);
            expect(claimable[0].amount).to.equal(3750);
        });
    
    });
});
