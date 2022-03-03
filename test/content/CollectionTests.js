const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Collection Contract Tests', () => {
    var deployerAddress, craftingSystemAddress, lootboxSystemAddress, playerAddress, player2Address;
    var AccessControlManager, CollectionStorage, Collection;
    var collection;
    var collectionStorage;
    var accessControlManager;
    var asset;
    
    before(async () => {
        [deployerAddress, craftingSystemAddress, lootboxSystemAddress, playerAddress, player2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        CollectionStorage = await ethers.getContractFactory("CollectionStorage");
        Collection = await ethers.getContractFactory("Collection");
        asset = [
            ["arweave.net/tx/public-uri-0", "", ethers.constants.MaxUint256, deployerAddress.address, 20000],
            ["arweave.net/tx/public-uri-1", "", 100, ethers.constants.AddressZero, 0],
        ];
    });

    beforeEach(async () => {
        accessControlManager = await upgrades.deployProxy(AccessControlManager, []);
        collectionStorage = await upgrades.deployProxy(CollectionStorage, [deployerAddress.address, 10000, "arweave.net/tx-contract-uri"]);
        collection = await upgrades.deployProxy(Collection, [collectionStorage.address, accessControlManager.address]);

        await collectionStorage.grantRole(await collectionStorage.DEFAULT_ADMIN_ROLE(), collection.address);

        // give deployer address and crafting system approval; This would normally be done through the CollectionManager
        minter_role = await accessControlManager.MINTER_ROLE();
        await accessControlManager.grantRole(minter_role, deployerAddress.address);
        await accessControlManager.grantRole(minter_role, craftingSystemAddress.address);

        // Set the collection contract as the new parent
        await accessControlManager.setParent(collection.address);

        // Add 2 assets
        await collectionStorage.addAssetBatch(asset);
    });

    describe("Basic Tests", () => {
        it('Check Collection proper deployment', async () => {
            // Check initializer parameters
            expect(await collection.contractUri()).to.equal("arweave.net/tx-contract-uri");
        });
        
        it('Verify Collection Contract Interfaces', async () => {
            // ERC1155 Interface
            expect(await collection.supportsInterface("0xd9b67a26")).to.equal(true);

            // ICollection Interface
            expect(await collection.supportsInterface("0x79869ffe")).to.equal(true);

            // IContractUri Interface
            expect(await collection.supportsInterface("0xc0e24d5e")).to.equal(true);
            
            // IERC2981Upgradeable Interface
            expect(await collection.supportsInterface("0x2a55205a")).to.equal(true);
        });
    
        it('Check Supply', async () => {
            expect(await collection.totalSupply(0)).to.equal(0);
            expect(await collection.maxSupply(0)).to.equal(ethers.constants.MaxUint256);
            
            expect(await collection.totalSupply(1)).to.equal(0);
            expect(await collection.maxSupply(1)).to.equal(100);
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
            // Note: we use collection.methods['function()']() below because it hiddenUri() is an
            //       overloaded function
            
            const signature = await sign(playerAddress.address, [0], [1], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0], [1], 1, craftingSystemAddress.address, signature];
            await collection.connect(playerAddress).mintBatch(mintData);
    
            expect(await collection.balanceOf(playerAddress.address, 0)).to.equal(1);
        });

        it("Uri", async () => {
            expect(await collection['uri(uint256,uint256)'](0, 0))
                .to.equal("arweave.net/tx/public-uri-0");
            
            expect(await collection['uri(uint256)'](0))
                .to.equal("arweave.net/tx/public-uri-0");
        });
    
        it('Royalty', async () => {
            // test royalties (ERC2981)
            var fees = await collection.royaltyInfo(0, 1000);
            expect(fees.receiver).to.equal(deployerAddress.address);
            expect(fees.royaltyAmount).to.equal(20);
        });
    
        it('Add Assets', async () => {
            // invalid add because asset already exists
            var newAssets = [
                ["arweave.net/tx/public-uri-2", "", 1000, ethers.constants.AddressZero, 0]
            ];
            
            await expect(collectionStorage.addAssetBatch(newAssets))
                .to.emit(collectionStorage, 'AssetsAdded');
            
            expect(await collection.totalSupply(2)).to.equal(0);
            expect(await collection.maxSupply(2)).to.equal(1000);
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
            const signature = await sign(playerAddress.address, [0, 1], [10, 1], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0, 1], [10, 1], 1, craftingSystemAddress.address, signature];
            expect (await collection.connect(playerAddress).mintBatch(mintData))
                .to.emit(collection, "Mint");
            
            expect(await collection.totalSupply(0)).to.equal(10);
            expect(await collection.totalSupply(1)).to.equal(1);

            expect(await collection.balanceOf(playerAddress.address, 0)).to.equal(10);
        });

        it('Mint data length input mismatch', async () => {
            const signature = await sign(playerAddress.address, [0, 1], [10], 1, craftingSystemAddress.address, collection.address);
            var invalidLengthData = [playerAddress.address, [0, 1], [10], 1, craftingSystemAddress.address, signature];

            await expect(collection.connect(playerAddress).mintBatch(invalidLengthData)).to.be.reverted;
        });

        it('Mint invalid token id', async () => {
            const signature = await sign(playerAddress.address, [4, 5], [1, 1], 1, craftingSystemAddress.address, collection.address);
            var invalidTokenIdData = [playerAddress.address, [4, 5], [1, 1], 1, craftingSystemAddress.address, signature];
            
            await expect(collection.connect(playerAddress).mintBatch(invalidTokenIdData)).to.be.reverted;
        });

        it('Mint invalid supply', async () => {
            const signature = await sign(playerAddress.address, [1], [300], 1, craftingSystemAddress.address, collection.address);
            var invalidSupplyData = [playerAddress.address, [1], [300], 1, craftingSystemAddress.address, signature];
            
            await expect(collection.connect(playerAddress).mintBatch(invalidSupplyData)).to.be.reverted;
        });

        it('Mint invalid supply 2', async () => {
            const signature = await sign(playerAddress.address, [1], [30], 1, craftingSystemAddress.address, collection.address);
            var validSupplyData = [playerAddress.address, [1], [30], 1, craftingSystemAddress.address, signature];
            
            await collection.connect(playerAddress).mintBatch(validSupplyData);

            expect(await collection.totalSupply(1)).to.equal(30);
            expect(await collection.balanceOf(playerAddress.address, 1)).to.equal(30);

            const signature2 = await sign(playerAddress.address, [1], [90], 2, craftingSystemAddress.address, collection.address);
            var invalidSupplyData = [playerAddress.address, [1], [90], 2, craftingSystemAddress.address, signature2];
            
            await expect(collection.connect(playerAddress).mintBatch(invalidSupplyData)).to.be.reverted;
            expect(await collection.totalSupply(1)).to.equal(30);
            expect(await collection.balanceOf(playerAddress.address, 1)).to.equal(30);
        });
    });

    describe("Burn", () => {
        it('Burn Assets', async () => {
            const signature = await sign(playerAddress.address, [0, 1], [10, 75], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0, 1], [10, 75], 1, craftingSystemAddress.address, signature];
            await collection.connect(playerAddress).mintBatch(mintData);
    
            var burnData = [playerAddress.address, [0, 1], [5, 25]];
            expect (await collection.connect(playerAddress).burnBatch(burnData))
                .to.emit(collection, "Burn");

            expect(await collection.connect(playerAddress).totalSupply(0)).to.equal(5);
            expect(await collection.connect(playerAddress).totalSupply(1)).to.equal(50);
    
            await collection.connect(playerAddress).burnBatch(burnData);
            expect(await collection.connect(playerAddress).totalSupply(0)).to.equal(0);
            expect(await collection.connect(playerAddress).totalSupply(1)).to.equal(25);
            
            expect(await collection.balanceOf(playerAddress.address, 0)).to.equal(0);
            expect(await collection.balanceOf(playerAddress.address, 1)).to.equal(25);
        });
        
        it('Invalid burns', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await collection.connect(playerAddress).mintBatch(mintData);
    
            var burnData = [playerAddress.address, [0], [5]];

            await expect(collection.connect(lootboxSystemAddress).burnBatch(burnData)).to.be.reverted;
            await expect(collection.connect(player2Address).burnBatch(burnData)).to.be.reverted;

            // player tries to burn more assets than they have
            var burnData2 = [playerAddress.address, [0], [11]];
            await expect (collection.connect(playerAddress).burnBatch(burnData2)).to.be.reverted;

            expect(await collection.balanceOf(playerAddress.address, 0)).to.equal(10);
        });
    });

    describe("Transfer", () => {
        it('Transfer Assets', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await collection.connect(playerAddress).mintBatch(mintData);
    
            await expect(collection.connect(playerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0))
                .to.emit(collection, 'TransferSingle');
        });
    
        it('Invalid Transfer Assets', async () => {
            const signature = await sign(playerAddress.address, [0], [10], 1, craftingSystemAddress.address, collection.address);
            var mintData = [playerAddress.address, [0], [10], 1, craftingSystemAddress.address, signature];
            await collection.connect(playerAddress).mintBatch(mintData);
            
            // insufficient balance
            await expect(collection.connect(playerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 15, 0)).to.be.reverted;
            await expect(collection.connect(player2Address).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0)).to.be.reverted;
            await expect(collection.connect(deployerAddress).safeTransferFrom(playerAddress.address, player2Address.address, 0, 1, 0)).to.be.reverted;
        });
    });
});
