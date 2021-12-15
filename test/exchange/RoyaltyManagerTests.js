const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Royalty Manager Contract', ()=> {
    var deployerAddress, testManagerAddress, creatorAddress, playerAddress, staker1;

    var resolver;
    var contentFactory;
    var content;
    var contentManager;

    var rawrToken;
    var royaltyManager;
    var escrow;
    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {
        [deployerAddress, testManagerAddress, creatorAddress, playerAddress, staker1] = await ethers.getSigners();

        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        AddressResolver = await ethers.getContractFactory("AddressResolver");
        MockToken = await ethers.getContractFactory("MockToken");
        MockStaking = await ethers.getContractFactory("MockStaking");
        Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
        ExchangeFeesEscrow = await ethers.getContractFactory("ExchangeFeesEscrow");
        RoyaltyManager = await ethers.getContractFactory("RoyaltyManager");

        originalAccessControlManager = await AccessControlManager.deploy();
        originalContent = await Content.deploy();
        originalContentStorage = await ContentStorage.deploy();
        originalContentManager = await ContentManager.deploy();
    
        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);
        
        resolver = await upgrades.deployProxy(AddressResolver, []);
    });


    async function ContentContractSetup() {
        var tx = await contentFactory.createContracts(creatorAddress.address, 20000, "arweave.net/tx-contract-uri");
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);
            
        // Add 2 assets
        var asset = [
            ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, ethers.constants.AddressZero, 0]
        ];

        await contentManager.addAssetBatch(asset);
    }

    async function RawrTokenSetup() {
        // Setup RAWR token
        rawrToken = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
        
        // Give player 1 20000 RAWR tokens
        await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
    }

    async function RoyaltyManagerSetup() {
        staking = await MockStaking.deploy(resolver.address);
        await feesEscrow.registerManager(staking.address);
        
        // register the royalty manager
        await resolver.registerAddress(["0x29a264aa", "0x7f170836", "0x1b48faca"], [escrow.address, feesEscrow.address, staking.address]);
        
        await staking.connect(staker1).stake(ethers.BigNumber.from(100).mul(_1e18));
        await feesEscrow.setRate(3000);

        // Register the royalty manager
        await escrow.registerManager(royaltyManager.address);
        await feesEscrow.registerManager(royaltyManager.address);
        
        // Testing manager to create fake data
        await escrow.registerManager(testManagerAddress.address)
        await feesEscrow.registerManager(testManagerAddress.address);

        // add token support
        await escrow.connect(testManagerAddress).addSupportedTokens(rawrToken.address);
    }

    beforeEach(async () => {
        escrow = await upgrades.deployProxy(Erc20Escrow, []); 
        feesEscrow = await upgrades.deployProxy(ExchangeFeesEscrow, [resolver.address]); 
        royaltyManager = await upgrades.deployProxy(RoyaltyManager, [resolver.address]);
    });
    
    describe("Basic Tests", () => {
        it('Check if Royalty Manager was deployed properly', async () => {
            expect(royaltyManager.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Supports the Royalty Manager Interface', async () => {
            // IRoyaltyManager Interface
            expect(await royaltyManager.supportsInterface("0x96c4ccf4")).to.equal(true);
        });
    });
    
    describe("Functional Tests", () => {
        it('Deposit Royalty', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
            await RoyaltyManagerSetup();
    
            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(230).mul(_1e18));
            await royaltyManager['transferRoyalty(address,address,address,uint256)'](playerAddress.address, rawrToken.address, creatorAddress.address, ethers.BigNumber.from(200).mul(_1e18));
    
            var claimable = await escrow.connect(creatorAddress).claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(200).mul(_1e18));
    
            await royaltyManager['transferPlatformFee(address,address,uint256)'](playerAddress.address, rawrToken.address, ethers.BigNumber.from(10000).mul(_1e18));
    
            expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(30).mul(_1e18));
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(30).mul(_1e18));
        });
        
        it('Transfer Royalty from escrow to royalty owner', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
            await RoyaltyManagerSetup();

            // deposit 10000 RAWR tokens for Order 1 
            
            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(10000).mul(_1e18));
            await escrow.connect(testManagerAddress).deposit(rawrToken.address, 1, playerAddress.address, ethers.BigNumber.from(10000).mul(_1e18));

            await royaltyManager['transferRoyalty(uint256,address,uint256)'](1, creatorAddress.address, ethers.BigNumber.from(200).mul(_1e18));
            await royaltyManager['transferPlatformFee(address,uint256,uint256)'](rawrToken.address, 1, ethers.BigNumber.from(10000).mul(_1e18));

            claimable = await escrow.connect(creatorAddress).claimableTokensByOwner(creatorAddress.address);
            expect(claimable.amounts[0]).to.equal(ethers.BigNumber.from(200).mul(_1e18));
            
            // check if amounts were moved from the escrow for the order to claimable for the creator
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(9770).mul(_1e18));
            
            expect(await rawrToken.balanceOf(feesEscrow.address)).to.equal(ethers.BigNumber.from(30).mul(_1e18));
            expect(await escrow.escrowedTokensByOrder(1)).to.equal(ethers.BigNumber.from(9770).mul(_1e18));
            expect(await feesEscrow.totalFees(rawrToken.address)).to.equal(ethers.BigNumber.from(30).mul(_1e18));
        });
        
        it('Get Royalties for an asset', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
            await RoyaltyManagerSetup();
            
            var assetData = [content.address, 1];
            var results = await royaltyManager.payableRoyalties(assetData, ethers.BigNumber.from(10000).mul(_1e18));

            expect(results.receiver).to.equal(creatorAddress.address);
            expect(results.royaltyFee).to.equal(ethers.BigNumber.from(200).mul(_1e18));
            expect(results.remaining).to.equal(ethers.BigNumber.from(9770).mul(_1e18));
        });

        it('Claim Royalties', async () => {
            await ContentContractSetup();
            await RawrTokenSetup();
            await RoyaltyManagerSetup();
    
            await rawrToken.connect(playerAddress).approve(escrow.address, ethers.BigNumber.from(300).mul(_1e18));
            await royaltyManager['transferRoyalty(address,address,address,uint256)'](playerAddress.address, rawrToken.address, creatorAddress.address, ethers.BigNumber.from(200).mul(_1e18));
    
            // claim royalties
            await royaltyManager.claimRoyalties(creatorAddress.address);
    
            var claimable = await royaltyManager.connect(creatorAddress).claimableRoyalties(creatorAddress.address);
            expect(claimable.amounts.length).to.equal(0);
        });
    });
});
