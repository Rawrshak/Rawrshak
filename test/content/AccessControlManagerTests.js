const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('AccessControlManager Contract Tests', () => {
    var manager;
    var deployerAddress, deployerAltAddress, minterAddress, playerAddress, player2Address;
    var AccessControlManager, ContentStorage, Content;

    before(async () => {
        [deployerAddress, deployerAltAddress, minterAddress, playerAddress, player2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
    });

    beforeEach(async () => {
        manager = await upgrades.deployProxy(AccessControlManager, []);
    });

    describe("Basic Tests", () => {
        it('Check Deployer has the Default Admin Role', async () => {
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();

            expect(await manager.hasRole(default_admin_role, deployerAddress.address)).to.equal(true);
        });
        
        it('Verify AccessControlManager Contract Interfaces', async () => {
            // IAccessControlManager Interface
            expect(await manager.supportsInterface("0xe492210d")).to.equal(true);

            // IAccessControlUpgradeable Interface
            expect(await manager.supportsInterface("0x7965db0b")).to.equal(true);

            // IContentSubsystemBase Interface
            expect(await manager.supportsInterface("0x7460af1d")).to.equal(true);
        });
    
        it('Change Parent and check roles', async () => {
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);

            var results = await manager.setParent(content.address);

            await expect(results)
                .to.emit(manager, 'ParentSet')
                .withArgs(content.address);
    
            var default_admin_role = await contentStorage.DEFAULT_ADMIN_ROLE();
            expect(await manager.hasRole(default_admin_role, content.address)).to.equal(true);
            
            // deployer is not the default admin anymore
            expect(await manager.hasRole(default_admin_role, deployerAddress.address)).to.equal(false);
        });
    
        it('Invalid SetParent()', async () => {
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
            
            // caller doesn't have the default admin role
            await expect(manager.connect(playerAddress).setParent(content.address)).to.be.reverted;
        });
        
        it('Add and Remove Minter Address', async () => {
            var minter_role = await manager.MINTER_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);

            // check minter role
            expect(await manager.hasRole(minter_role, minterAddress.address)).to.equal(true);

            await manager.revokeRole(minter_role, minterAddress.address);
            expect(await manager.hasRole(minter_role, minterAddress.address)).to.equal(false);
        });
    });
    
    describe("Mint Verification", () => {
        it('verifyMintDataAndIncrementNonce() for owner', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, deployerAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
    
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            // Sign where the verifying contract address is the contentContractAddress
            const signature = await sign(playerAddress.address, [1], [1], 0, deployerAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 0, deployerAddress.address, signature];
    
            // deployerAltAddress pretending to be contract address and calling verifyMintDataAndIncrementNonce()
            await manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, deployerAddress.address);

            // user nonce doesn't matter because caller has minter role
            expect(await manager.userMintNonce(playerAddress.address)).to.equal(0);
        });
    
        it('verifyMintDataAndIncrementNonce() for minter accounts', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
           
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            const signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 1, minterAddress.address, signature];
    
            // deployerAltAddress pretending to be contract address and calling verifyMintDataAndIncrementNonce(); 
            // The caller has the minter role, so it bypasses the check and mints.
            await manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, minterAddress.address);
            
            // user nonce doesn't matter because caller has minter role
            expect(await manager.userMintNonce(playerAddress.address)).to.equal(0);
        });
    
        it('verifyMintDataAndIncrementNonce() for from signed message', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            const signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 1, minterAddress.address, signature];
    
            // The caller is a player but has a signed message from the minter to mint for them.
            await manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address);
            
            // user nonce changed because user made the call
            expect(await manager.userMintNonce(playerAddress.address)).to.equal(1);
        });
    });
    
    describe("verifyMintDataAndIncrementNonce() failure from signed message", () => {
        it('Minter address does not have minter role', async () => {
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            var signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 1, minterAddress.address, signature];
    
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;
        });

        it('Revoked minter role', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.revokeRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            const signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 1, minterAddress.address, signature];
    
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;
        });
        
        it('Invalid Nonce', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);

            var signature = await sign(playerAddress.address, [1], [1], 0, minterAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 0, minterAddress.address, signature];
    
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;
        });

        it('Signer does not match', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);

            var signature = await sign(playerAddress.address, [1], [1], 1, playerAddress.address, content.address);
            var mintData = [playerAddress.address, [1], [1], 1, minterAddress.address, signature];
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;
        });

        it('Invalid caller', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            var signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            var mintData = [player2Address.address, [1], [1], 1, minterAddress.address, signature];
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, player2Address.address)).to.be.reverted;
        });

        it('Invalid mint data', async () => {
            var minter_role = await manager.MINTER_ROLE();
            var default_admin_role = await manager.DEFAULT_ADMIN_ROLE();
            await manager.grantRole(minter_role, minterAddress.address);
            await manager.grantRole(default_admin_role, deployerAltAddress.address);
            
            // Set Content Contract as parent & verifying contract
            var contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
            var content = await upgrades.deployProxy(Content, [contentStorage.address, manager.address]);
    
            // Setting the parent to the content contract revokes the DEFAULT_ADMIN_ROLE from the owner
            await manager.setParent(content.address);
            
            var signature = await sign(playerAddress.address, [1], [1], 1, minterAddress.address, content.address);
            // tries to mint more than the signature authorizes
            var mintData = [playerAddress.address, [1], [1000], 1, minterAddress.address, signature];
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;

            // tries to mint a different asset
            var mintData = [playerAddress.address, [2], [1], 1, minterAddress.address, signature];
            await expect(manager.connect(deployerAltAddress).verifyMintDataAndIncrementNonce(mintData, playerAddress.address)).to.be.reverted;
        });
    });



    
});
