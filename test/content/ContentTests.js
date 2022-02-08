const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Content Contract Tests', () => {
    var deployerAddress, craftingSystemAddress, lootboxSystemAddress, playerAddress, player2Address;
    var AccessControlManager, ContentStorage, Content;
    var content;
    var contentStorage;
    var accessControlManager;
    var asset;
    
    before(async () => {
        [deployerAddress, craftingSystemAddress, lootboxSystemAddress, playerAddress, player2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManager = await upgrades.deployProxy(AccessControlManager, []);
        contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
        content = await upgrades.deployProxy(Content, [contentStorage.address, accessControlManager.address]);

        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), content.address);

        // give deployer address and crafting system approval; This would normally be done through the ContentManager
        minter_role = await accessControlManager.MINTER_ROLE();
        await accessControlManager.grantRole(minter_role, deployerAddress.address);
        await accessControlManager.grantRole(minter_role, craftingSystemAddress.address);

        // Set the content contract as the new parent
        await accessControlManager.setParent(content.address);

        // Add 2 assets
        await contentStorage.addAssetBatch(asset);
    });

    describe("Basic Tests", () => {
        it('Check Content proper deployment', async () => {
            // Check initializer parameters
            expect(await content.contractUri()).to.equal("arweave.net/tx-contract-uri");
        });
        
        it('Verify Content Contract Interfaces', async () => {
            // ERC1155 Interface
            expect(await content.supportsInterface("0xd9b67a26")).to.equal(true);

            // IContent Interface
            expect(await content.supportsInterface("0x6a3af2b5")).to.equal(true);

            // IContractUri Interface
            expect(await content.supportsInterface("0xc0e24d5e")).to.equal(true);
            
            // IERC2981Upgradeable Interface
            expect(await content.supportsInterface("0x2a55205a")).to.equal(true);
        });
    
        it('Check Supply', async () => {
            expect(await content.totalSupply(0)).to.equal(0);
            expect(await content.maxSupply(0)).to.equal(ethers.constants.MaxUint256);
            
            expect(await content.totalSupply(1)).to.equal(0);
            expect(await content.maxSupply(1)).to.equal(100);
        });
    });

    describe("Storage", () => {
        // CreateData
        // {
        //     publicDataUri,
        //     hiddenDataUri,
        //     maxSupply
        //     royaltyReceiver,
        //     royaltyRate
        // }
    
        it('Mint Batch', async () => {
            // Test token uri
            // Note: we use content.methods['function()']() below because it hiddenUri() is an
            //       overloaded function
            
            const signature = await sign(playerAddress.address, [0], [1], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0], [1], 1, craftingSystemAddress.address, signature];
            await content.connect(playerAddress).mintBatch(mintData);
    
            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(1);
        });

        it("Uri", async () => {
            expect(await content['uri(uint256,uint256)'](0, 0))
                .to.equal("arweave.net/tx/public-uri-0");
            
            expect(await content['uri(uint256)'](0))
            .to.equal("arweave.net/tx/public-uri-0");
        });
    
        it('Royalty', async () => {
            // test royalties (ERC2981)
            var fees = await content.royaltyInfo(0, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(20);
        });
    
        it('Add Assets', async () => {
            // invalid add because asset already exists
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "", 1000, ethers.constants.AddressZero, 0]
            ];
            
            await expect(contentStorage.addAssetBatch(newAssets))
                .to.emit(contentStorage, 'AssetsAdded');
            
            expect(await content.totalSupply(2)).to.equal(0);
            expect(await content.maxSupply(2)).to.equal(1000);
        });
    });

    describe("Mint", () => {
        // MintData
        // {
        //     to,
        //     [
        //         tokenId,
        //         tokenId
        //     ],
        //     [
        //         amount,
        //         amount
        //     ]
        // }

        it('Mint Assets', async () => {
            const signature = await sign(playerAddress.address, [0, 1], [10, 1], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0, 1], [10, 1], 1, craftingSystemAddress.address, signature];
            expect (await content.connect(playerAddress).mintBatch(mintData))
                .to.emit(content, "Mint");
            
            expect(await content.totalSupply(0)).to.equal(10);
            expect(await content.totalSupply(1)).to.equal(1);

            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(10);
        });

        it('Mint data length input mismatch', async () => {
            const signature = await sign(playerAddress.address, [0, 1], [10], 1, craftingSystemAddress.address, content.address);
            var invalidLengthData = [playerAddress.address, [0, 1], [10], 1, craftingSystemAddress.address, signature];

            await expect(content.connect(playerAddress).mintBatch(invalidLengthData)).to.be.reverted;
        });

        it('Mint invalid token id', async () => {
            const signature = await sign(playerAddress.address, [4, 5], [1, 1], 1, craftingSystemAddress.address, content.address);
            var invalidTokenIdData = [playerAddress.address, [4, 5], [1, 1], 1, craftingSystemAddress.address, signature];
            
            await expect(content.connect(playerAddress).mintBatch(invalidTokenIdData)).to.be.reverted;
        });

        it('Mint invalid supply', async () => {
            const signature = await sign(playerAddress.address, [1], [300], 1, craftingSystemAddress.address, content.address);
            var invalidSupplyData = [playerAddress.address, [1], [300], 1, craftingSystemAddress.address, signature];
            
            await expect(content.connect(playerAddress).mintBatch(invalidSupplyData)).to.be.reverted;
        });

        it('Mint invalid supply 2', async () => {
            const signature = await sign(playerAddress.address, [1], [30], 1, craftingSystemAddress.address, content.address);
            var validSupplyData = [playerAddress.address, [1], [30], 1, craftingSystemAddress.address, signature];
            
            await content.connect(playerAddress).mintBatch(validSupplyData);

            expect(await content.totalSupply(1)).to.equal(30);
            expect(await content.balanceOf(playerAddress.address, 1)).to.equal(30);

            const signature2 = await sign(playerAddress.address, [1], [90], 2, craftingSystemAddress.address, content.address);
            var invalidSupplyData = [playerAddress.address, [1], [90], 2, craftingSystemAddress.address, signature2];
            
            await expect(content.connect(playerAddress).mintBatch(invalidSupplyData)).to.be.reverted;
            expect(await content.totalSupply(1)).to.equal(30);
            expect(await content.balanceOf(playerAddress.address, 1)).to.equal(30);
        });
    });

    describe("Burn", () => {
        it('Burn Assets', async () => {
            const signature = await sign(playerAddress.address, [0, 1], [10, 75], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0, 1], [10, 75], 1, craftingSystemAddress.address, signature];
            await content.connect(playerAddress).mintBatch(mintData);
    
            var burnData = [playerAddress.address, [0, 1], [5, 25]];
            expect (await content.connect(playerAddress).burnBatch(burnData))
                .to.emit(content, "Burn");

            expect(await content.connect(playerAddress).totalSupply(0)).to.equal(5);
            expect(await content.connect(playerAddress).totalSupply(1)).to.equal(50);
    
            await content.connect(playerAddress).setApprovalForAll(craftingSystemAddress.address, true);
            await content.connect(craftingSystemAddress).burnBatch(burnData);
            expect(await content.connect(playerAddress).totalSupply(0)).to.equal(0);
            expect(await content.connect(playerAddress).totalSupply(1)).to.equal(25);
            
            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(0);
            expect(await content.balanceOf(playerAddress.address, 1)).to.equal(25);
        });
        
        it('Invalid burns', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await content.connect(playerAddress).mintBatch(mintData);
    
            var burnData = [playerAddress.address, [0], [5]];

            await expect(content.connect(lootboxSystemAddress).burnBatch(burnData)).to.be.reverted;
            await expect(content.connect(player2Address).burnBatch(burnData)).to.be.reverted;

            // player tries to burn more assets than they have
            var burnData2 = [playerAddress.address, [0], [11]];
            await expect (content.connect(playerAddress).burnBatch(burnData2)).to.be.reverted;

            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(10);
        });
    });

    describe("Transfer", () => {
        it('Transfer Assets', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await content.connect(playerAddress).mintBatch(mintData);
    
            await expect(content.connect(playerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0))
                .to.emit(content, 'TransferSingle');
        });
    
        it('Invalid Transfer Assets', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, content.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await content.connect(playerAddress).mintBatch(mintData);
            
            // insufficient balance
            await expect(content.connect(playerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 15, 0)).to.be.reverted;
            await expect(content.connect(player2Address).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0)).to.be.reverted;
            await expect(content.connect(deployerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0)).to.be.reverted;
        });
    });
});
