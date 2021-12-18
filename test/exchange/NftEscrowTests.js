const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('NFT Escrow Contract', () => {
    var deployerAddress, executionManagerAddress, royaltiesManagerAddress, playerAddress;

    var escrow;
    var content;
    var contentFactory;
    var assetData;

    before(async () => {
        [deployerAddress, executionManagerAddress, royaltiesManagerAddress, playerAddress] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        NftEscrow = await ethers.getContractFactory("NftEscrow");

        originalAccessControlManager = await AccessControlManager.deploy();
        originalContent = await Content.deploy();
        originalContentStorage = await ContentStorage.deploy();
        originalContentManager = await ContentManager.deploy();
    
        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);
    });

    beforeEach(async () => {
        escrow = await upgrades.deployProxy(NftEscrow, []);
        
        // Register the execution manager
        await escrow.registerManager(executionManagerAddress.address);
    });

    async function createContentContract() {
        var uri = "arweave.net/tx-contract-uri";

        // deploy contracts
        var tx = await contentFactory.createContracts(deployerAddress.address, 10000, uri);
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);
        
        var asset = [
            ["arweave.net/tx/public-uri-0", "arweave.net/tx/private-uri-0", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "arweave.net/tx/private-uri-1", 100, ethers.constants.AddressZero, 0]
        ];

        // Add 2 assets
        await contentManager.addAssetBatch(asset);

        // Mint an assets
        var mintData = [playerAddress.address, [0, 1], [10, 1], 0, ethers.constants.AddressZero, []];
        await content.connect(deployerAddress).mintBatch(mintData);

        assetData = [content.address, 0];

        // approve player
        await content.connect(playerAddress).setApprovalForAll(escrow.address, true);
    }

    describe("Basic Tests", () => {
        it('Check if NftEscrow was deployed properly', async () => {
            expect(escrow.address).not.equal(ethers.constants.AddressZero);
        });
    
        it('Supports the NftEscrow Interface', async () => {
            // INftEscrow Interface
            expect(await escrow.supportsInterface("0x06265fe7")).to.equal(true);
            
            // IERC721ReceiverUpgradeable Interface
            expect(await escrow.supportsInterface("0x150b7a02")).to.equal(true);
            
            // IERC1155ReceiverUpgradeable Interface
            expect(await escrow.supportsInterface("0x4e2312e0")).to.equal(true);

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
    
            expect(await escrow.registerManager(royaltiesManagerAddress.address))
                .to.emit(escrow, 'ManagerRegistered');
    
            expect(await escrow.hasRole(manager_role, executionManagerAddress.address)).to.equal(true);
            expect(await escrow.hasRole(manager_role, royaltiesManagerAddress.address)).to.equal(true);
        });
    });
    
    describe("Functional Tests", () => {
        it('Depositing Asset', async () => {
            await createContentContract();
    
            await escrow.connect(executionManagerAddress).deposit(1, playerAddress.address, 1, assetData);
    
            expect(await escrow.escrowedAmounts(1)).to.equal(1);
            expect(await content.balanceOf(escrow.address, 0)).to.equal(1);
            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(9);
            
            var internalAssetData = await escrow.escrowedAsset(1);
            expect(internalAssetData[0]).to.equal(assetData[0]);
            expect(internalAssetData[1]).to.equal(assetData[1]);
        });

        it('Withdraw Asset', async () => {
            await createContentContract();
    
            await escrow.connect(executionManagerAddress).deposit(1, playerAddress.address, 1, assetData);
            await escrow.connect(executionManagerAddress).withdraw(1, playerAddress.address, 1);
    
            expect(await escrow.escrowedAmounts(1)).to.equal(0);
            expect(await content.balanceOf(escrow.address, 0)).to.equal(0);
            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(10);
        });
    
        it('Invalid Withdraws', async () => {
            await createContentContract();
    
            await escrow.connect(executionManagerAddress).deposit(1, playerAddress.address, 1, assetData);
        
            await expect(escrow.connect(executionManagerAddress).withdraw(1, playerAddress.address, 2)).to.be.reverted;
            await expect(escrow.connect(executionManagerAddress).withdraw(2, playerAddress.address, 1)).to.be.reverted;
    
            expect(await escrow.escrowedAmounts(1)).to.equal(1);
        });

        it('Withdraw Batch Asset', async () => {
            await createContentContract();
    
            await escrow.connect(executionManagerAddress).deposit(1, playerAddress.address, 1, assetData);
            await escrow.connect(executionManagerAddress).deposit(2, playerAddress.address, 3, assetData);
            await escrow.connect(executionManagerAddress).deposit(3, playerAddress.address, 2, assetData);
            
            var orders = [1,2,3];
            var amounts = [1,3,1];
            await escrow.connect(executionManagerAddress).withdrawBatch(orders, playerAddress.address, amounts);
    
            expect(await escrow.escrowedAmounts(2)).to.equal(0);
            expect(await escrow.escrowedAmounts(3)).to.equal(1);
        });
    
        it('Invalid Withdraws', async () => {
            await createContentContract();

            await escrow.connect(executionManagerAddress).deposit(1, playerAddress.address, 1, assetData);
            await escrow.connect(executionManagerAddress).deposit(2, playerAddress.address, 3, assetData);
            await escrow.connect(executionManagerAddress).deposit(3, playerAddress.address, 2, assetData);
            
            var orders = [1,2,3];
            var amounts = [1,4,1];

            await expect(escrow.connect(executionManagerAddress).withdrawBatch(orders, playerAddress.address, amounts)).to.be.reverted;
            
            var orders = [1,4];
            var amounts = [1,1];
            await expect(escrow.connect(executionManagerAddress).withdrawBatch(orders, playerAddress.address, amounts)).to.be.reverted;
        });
    });
});
