const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Unique Content Contract Tests', () => {
    var uniqueContent
    var deployerAddress, deployerAltAddress, receiverAddress, playerAddress, player2Address;
    var AccessControlManager, ContentStorage, Content;
    var content;
    var contentStorage;
    var accessControlManager;
    var asset;
    var UniqueContent;

    before(async () => {
        [deployerAddress, deployerAltAddress, receiverAddress, playerAddress, player2Address] = await ethers.getSigners();
        UniqueContent = await ethers.getContractFactory("UniqueContent");
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
        contentStorage = await upgrades.deployProxy(ContentStorage, [deployerAltAddress.address, 12000, "arweave.net/tx-contract-uri"]);
        content = await upgrades.deployProxy(Content, [contentStorage.address, accessControlManager.address]);

        await contentStorage.grantRole(await contentStorage.DEFAULT_ADMIN_ROLE(), content.address);

        // give deployer address approval; This would normally be done through the ContentManager
        minter_role = await accessControlManager.MINTER_ROLE();
        await accessControlManager.grantRole(minter_role, deployerAddress.address);

        // Set the content contract as the new parent
        await accessControlManager.setParent(content.address);
        await contentStorage.addAssetBatch(asset);

        // playerAddress mints 2 of asset 0 and 1 of asset 1
        const signature = await sign(playerAddress.address, [0, 1], [2, 1], 1, deployerAddress.address, content.address);
        var mintData = [playerAddress.address, [0, 1], [2, 1], 1, deployerAddress.address, signature];
        await content.connect(playerAddress).mintBatch(mintData);

        // launch unique content contract
        uniqueContent = await upgrades.deployProxy(UniqueContent);
        
        // Give unique content contract permission to transfer original asset
        await content.connect(playerAddress).setApprovalForAll(uniqueContent.address, true);
    });

    describe("Basic Tests", () => {
        // Todo: Do interface checks
    });

    describe("Mint Tokens", () => {
        it('Mint function', async () => {            
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address, playerAddress.address], [20000, 10000], true];
            var uniqueAssetCreateData2 = [playerAddress.address, content.address, 1, "arweave.net/tx/unique-uri-1", [], [], false];

            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(2);
            results = await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            expect(results)
                .to.emit(uniqueContent, "Mint");
            expect(results)
                .to.emit(uniqueContent, "UniqueUriUpdated")
                .withArgs(0,0);
            expect(results)
                .to.emit(uniqueContent, "TokenRoyaltiesUpdated")
                .withArgs(0, [deployerAddress.address], [20000]);
            
            // checks whether the original asset has switched hands 
            expect(await content.balanceOf(playerAddress.address, 0)).to.equal(1);
            expect(await content.balanceOf(uniqueContent.address, 0)).to.equal(1);

            // checks whether the unique asset was minted to playerAddress
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);

            expect(await uniqueContent.uri(0,0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent.originalAssetUri(0,0)).to.equal("arweave.net/tx/public-uri-0");

            // multipleRoyaltyInfo() in UniqueContent.sol calculates royalty Amounts but if _salePrice is set to 1e6,
            // it cancels out the calculation and returns the royalty rates
            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(deployerAddress.address);
            expect(tokenFees[0][1]).to.equal(playerAddress.address);
            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(10000);

            // mint a second asset
            results = await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData2);
            expect(await uniqueContent.uri(0,0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent.uri(1,0)).to.equal("arweave.net/tx/unique-uri-1");
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(2);
        }); 

        it('Invalid mint', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [], [1], false];
            var uniqueAssetCreateData2 = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [playerAddress.address], [1000001], false];
            var uniqueAssetCreateData3 = [player2Address.address, content.address, 0, "arweave.net/tx/unique-uri-0", [], [], false];
            var uniqueAssetCreateData4 = [playerAddress.address, content.address, 1, "arweave.net/tx/unique-uri-1", [], [], false];

            // invalid royalties
            await expect(uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData)).to.be.reverted;
            await expect(uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData2)).to.be.reverted;
            // player 2 does not have the original asset
            await expect(uniqueContent.connect(player2Address).mint(uniqueAssetCreateData3)).to.be.reverted;
            // player runs out of assets for second minting process
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData4);
            await expect(uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData4)).to.be.reverted;
        });    
    });

    describe("Burn Tokens", () => {
        it('Burn function', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueContent.ownerOf(0)).to.equal(playerAddress.address);

            expect(await uniqueContent.connect(playerAddress).burn(0))
                .to.emit(uniqueContent, "Burn")
                .withArgs(playerAddress.address, 0);

            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(0);
            await expect(uniqueContent.ownerOf(0)).to.be.reverted; // non-existent token

            await expect(uniqueContent.uri(0,0)).to.be.reverted;
            await expect(uniqueContent.originalAssetUri(0,0)).to.be.reverted;
            await expect(uniqueContent.royaltyInfo(0, 50000)).to.be.reverted;
            await expect(uniqueContent.multipleRoyaltyInfo(0, 50000)).to.be.reverted;
        });

        it('Invalid burns', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [], [], false];
            var lockedAssetData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [], [], true];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            await uniqueContent.connect(playerAddress).mint(lockedAssetData);

            // player 2 tries to burn player 1's asset
            await expect(uniqueContent.connect(player2Address).burn(0)).to.be.reverted;
            // burning a creator locked asset
            await expect(uniqueContent.connect(playerAddress).burn(1)).to.be.reverted;
            // burning a burned/non-existent token
            await uniqueContent.connect(playerAddress).burn(0);
            await expect(uniqueContent.connect(playerAddress).burn(0)).to.be.reverted;
        });
    });

    describe("Transfer", () => {
        it('Transfer assets', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(1);
            expect(await uniqueContent.balanceOf(player2Address.address)).to.equal(0);

            var results = await uniqueContent.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](playerAddress.address, player2Address.address, 0);
            
            expect(results)
                .to.emit(uniqueContent, 'Transfer')
                .withArgs(playerAddress.address, player2Address.address, 0);

            expect(await uniqueContent.balanceOf(playerAddress.address)).to.equal(0);
            expect(await uniqueContent.ownerOf(0)).to.equal(player2Address.address);
        });
        
        it('Invalid transfer', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueContent.connect(player2Address)["safeTransferFrom(address,address,uint256)"](playerAddress.address, player2Address.address, 0)).to.be.reverted;
        });
    });

    describe("Uri Tests", () => {
        it('Update original asset uri', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            await contentStorage.setPublicUriBatch([[0, "arweave.net/tx/public-uri-0v2"]]);

            expect(await uniqueContent.originalAssetUri(0,0)).to.equal("arweave.net/tx/public-uri-0");
            expect(await uniqueContent.originalAssetUri(0,1)).to.equal("arweave.net/tx/public-uri-0v2");
            expect(await uniqueContent.originalAssetUri(0,100)).to.equal("arweave.net/tx/public-uri-0v2");
        });

        it('Update unique asset uri', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            await expect(uniqueContent.connect(playerAddress).setUniqueUri(0,"arweave.net/tx/unique-uri-0v2"))
                .to.emit(uniqueContent, "UniqueUriUpdated")
                .withArgs(0,1);
            
            expect(await uniqueContent.uri(0,0)).to.equal("arweave.net/tx/unique-uri-0");
            expect(await uniqueContent.uri(0,1)).to.equal("arweave.net/tx/unique-uri-0v2");
            expect(await uniqueContent.uri(0,100)).to.equal("arweave.net/tx/unique-uri-0v2");
        });

        it('Invalid unique asset uri', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", [deployerAddress.address], [20000], false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            
            await expect(uniqueContent.connect(playerAddress).setUniqueUri(100, "arweave.net/tx/unique-uri-100")).to.be.reverted;
            await expect(uniqueContent.connect(player2Address).setUniqueUri(0, "arweave.net/tx/unique-uri-0")).to.be.reverted;

            //transfers asset to another player and attempt to set unique uri
            await uniqueContent.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](playerAddress.address, player2Address.address, 0);
            // owner but not creator is unable set unique uri
            expect(await uniqueContent.ownerOf(0)).to.equal(player2Address.address);
            await expect(uniqueContent.connect(player2Address).setUniqueUri(0, "arweave.net/tx/unique-uri-0v2")).to.be.reverted;
            expect(await uniqueContent.uri(0,100)).to.equal("arweave.net/tx/unique-uri-0");            
        });
    });
    
    describe("Royalty Tests", () => {
        it('Update token royalties with one less receiver', async () => {
            var receivers = [deployerAddress.address, playerAddress.address, receiverAddress.address];
            var rates = [30000, 10000, 5000];
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            
            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(deployerAddress.address);
            expect(tokenFees[0][1]).to.equal(playerAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(30000);
            expect(tokenFees[1][1]).to.equal(10000);
            expect(tokenFees[1][2]).to.equal(5000);

            // update royalties with only 2 receivers
            var receivers2 = [deployerAddress.address, receiverAddress.address];
            var rates2 = [20000, 15000];

            await expect(uniqueContent.connect(playerAddress).setTokenRoyalties(0, receivers2, rates2))
                .to.emit(uniqueContent, "TokenRoyaltiesUpdated")
                .withArgs(0, receivers2, rates2);

            var tokenFees2 = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees2[0][0]).to.equal(deployerAddress.address);
            expect(tokenFees2[0][1]).to.equal(receiverAddress.address);
            expect(tokenFees2[1][0]).to.equal(20000);
            expect(tokenFees2[1][1]).to.equal(15000);

            // makes sure there are only 2 LibRoyalty.Fee objects
            expect(tokenFees2[0][2]).to.equal(undefined);
            expect(tokenFees2[1][2]).to.equal(undefined);
        });

        it('Update token royalties with no royalties', async () => {
            var receivers = [deployerAddress.address, playerAddress.address, receiverAddress.address];
            var rates = [30000, 10000, 5000];
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            await uniqueContent.connect(playerAddress).setTokenRoyalties(0, [], []);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 1000000);
            expect(tokenFees[0][0]).to.equal(undefined);
            expect(tokenFees[1][0]).to.equal(undefined);
        });

        it('Calculate royalty amounts', async () => {
            var receivers = [deployerAddress.address, playerAddress.address, receiverAddress.address];
            var rates = [30000, 10000, 5000];
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "arweave.net/tx/unique-uri-0", receivers, rates, false];
            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueContent.multipleRoyaltyInfo(0, 100000);
            expect(tokenFees[0][0]).to.equal(deployerAddress.address);
            expect(tokenFees[0][1]).to.equal(playerAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
    
            expect(tokenFees[1][0]).to.equal(3000);
            expect(tokenFees[1][1]).to.equal(1000);
            expect(tokenFees[1][2]).to.equal(500);
        });

        it('Check royalty info', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "", [], [], false];
            var uniqueAssetCreateData2 = [playerAddress.address, content.address, 1, "", [playerAddress.address], [10000], false];

            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueContent.royaltyInfo(0, 1000000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(20000);

            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData2);

            tokenFees = await uniqueContent.royaltyInfo(1, 1000000);
            // token royalty from contract royalty
            expect(tokenFees.receiver).to.equal(deployerAltAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(12000);
        });
        
        it('Update original item royalty', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "", [], [], false];

            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);

            var tokenFees = await uniqueContent.royaltyInfo(0, 1000000);
            expect(tokenFees.receiver).to.equal(deployerAddress.address);
            expect(tokenFees.royaltyAmount).to.equal(20000);

            await contentStorage.setTokenRoyaltiesBatch([[0, deployerAltAddress.address, 15000]]);

            var tokenFees2 = await uniqueContent.royaltyInfo(0, 1000000);
            expect(tokenFees2.receiver).to.equal(deployerAltAddress.address);
            expect(tokenFees2.royaltyAmount).to.equal(15000);
        });

        it('Invalid set token royalties', async () => {
            var uniqueAssetCreateData = [playerAddress.address, content.address, 0, "", [], [], false];

            await uniqueContent.connect(playerAddress).mint(uniqueAssetCreateData);
            var receivers = [deployerAddress.address, playerAddress.address, receiverAddress.address];
            var invalidRates1 = [500000, 500000, 1];
            var invalidRates2 = [10000, 20000];
            var validRates = [10000, 20000, 30000];

            await expect(uniqueContent.connect(playerAddress).setTokenRoyalties(0, receivers, invalidRates1)).to.be.reverted;
            await expect(uniqueContent.connect(playerAddress).setTokenRoyalties(0, receivers, invalidRates2)).to.be.reverted;

            // transfers asset to another player and attempt to set token royalties
            await uniqueContent.connect(playerAddress)["safeTransferFrom(address,address,uint256)"](playerAddress.address, player2Address.address, 0);
            // owner but not creator is unable set token royalties
            expect(await uniqueContent.ownerOf(0)).to.equal(player2Address.address);
            await expect(uniqueContent.connect(player2Address).setTokenRoyalties(0, receivers, validRates)).to.be.reverted;    
        });
    });
});