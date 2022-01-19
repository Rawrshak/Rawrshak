const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Multiple Royalties Contract Tests', () => {
    var multipleRoyalties
    var creatorAddress, creatorAltAddress, receiverAddress, playerAddress;
    var TestMultipleRoyalties;

    before(async () => {
        [creatorAddress, creatorAltAddress, receiverAddress, playerAddress] = await ethers.getSigners();
        TestMultipleRoyalties = await ethers.getContractFactory("TestMultipleRoyalties");
    });
    
    beforeEach(async () => {
        multipleRoyalties = await upgrades.deployProxy(TestMultipleRoyalties);
    });

    describe("Basic Tests", () => {
        it('Get royalty length', async () => {
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var receivers2 = [receiverAddress.address];
            var rates = [5000, 5000, 1000];
            var rates2 = [9000];

            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);
            await multipleRoyalties.setTokenRoyalties(1, receivers2, rates2);

            expect(await multipleRoyalties.getTokenRoyaltiesLength(0)).to.equal(3)
            expect(await multipleRoyalties.getTokenRoyaltiesLength(1)).to.equal(1)
        });

        it('Verify royalties', async () => {
            var originalRoyalty1 = 15000;
            var receivers1 = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates1 = [20000, 10000, 10000];

            var originalRoyalty2 = 10000;
            var receivers2 = [creatorAddress.address, receiverAddress.address];
            var rates2 = [10000, 30000];

            expect(await multipleRoyalties.verifyRoyalties(receivers1, rates1, originalRoyalty1)).to.equal(true);
            expect(await multipleRoyalties.verifyRoyalties(receivers2, rates2, originalRoyalty2)).to.equal(true);
        });

        it('Invalid royalties', async () => {
            var originalRoyalty = 7500;
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates1 = [497500, 495000, 1];
            var rates2 = [10000, 30000, 20000, 10000];
            var rates3 = [20000];

            expect(await multipleRoyalties.verifyRoyalties(receivers, rates1, originalRoyalty)).to.equal(false);
            // length mismatch
            expect(await multipleRoyalties.verifyRoyalties(receivers, rates2, originalRoyalty)).to.equal(false);
            expect(await multipleRoyalties.verifyRoyalties(receivers, rates3, originalRoyalty)).to.equal(false);
        });

        it('Delete token royalties', async () => {
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates = [20000, 10000, 5000];

            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);

            var tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(creatorAddress.address);
            expect(tokenFees[1][0]).to.equal(20000);

            await multipleRoyalties.deleteTokenRoyalties(0);
            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(undefined);
            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[0][2]).to.equal(undefined);

            expect(tokenFees[1][0]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
            expect(tokenFees[1][2]).to.equal(undefined);
        });
    });

    describe("Set Royalties", () => {
        it('Set token royalties', async () => {
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates = [20000, 10000, 5000];

            await expect(multipleRoyalties.setTokenRoyalties(0, receivers, rates))
                .to.emit(multipleRoyalties, 'TokenRoyaltiesUpdated')
                .withArgs(0, receivers, rates);

            var tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(creatorAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAltAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(10000);
            expect(tokenFees[1][2]).to.equal(5000);
        });

        it('Update token royalties with various receiver lengths', async () => {
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates = [30000, 10000, 5000];
            // set original royalties to 3 receivers
            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);
            
            var tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(creatorAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAltAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(30000);
            expect(tokenFees[1][1]).to.equal(10000);
            expect(tokenFees[1][2]).to.equal(5000);

            // update royalties with only 2 receivers
            var newReceivers = [creatorAltAddress.address, receiverAddress.address];
            var newRates = [20000, 15000];

            await multipleRoyalties.setTokenRoyalties(0, newReceivers, newRates);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(creatorAltAddress.address);
            expect(tokenFees[0][1]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(15000);

            // makes sure there are only 2 LibRoyalty.Fee objects
            expect(tokenFees[0][2]).to.equal(undefined);
            expect(tokenFees[1][2]).to.equal(undefined);

            // update royalties with 4 receivers
            newReceivers = [playerAddress.address, creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            newRates = [4000, 16000, 8000, 12000];

            await multipleRoyalties.setTokenRoyalties(0, newReceivers, newRates);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(playerAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAddress.address);
            expect(tokenFees[0][2]).to.equal(creatorAltAddress.address);
            expect(tokenFees[0][3]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(4000);
            expect(tokenFees[1][1]).to.equal(16000);
            expect(tokenFees[1][2]).to.equal(8000);
            expect(tokenFees[1][3]).to.equal(12000);
        });

        it('Update to no royalties', async () => {
            var receivers = [creatorAddress.address, creatorAltAddress.address, receiverAddress.address];
            var rates = [30000, 10000, 5000];
            // set original royalties to 3 receivers
            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);
            
            var tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(creatorAddress.address);
            expect(tokenFees[0][1]).to.equal(creatorAltAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(30000);
            expect(tokenFees[1][1]).to.equal(10000);
            expect(tokenFees[1][2]).to.equal(5000);

            // update royalties with no receivers
            await multipleRoyalties.setTokenRoyalties(0, [], []);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(undefined);
            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[0][2]).to.equal(undefined);

            expect(tokenFees[1][0]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
            expect(tokenFees[1][2]).to.equal(undefined);

            // reset royalties to normal
            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][2]).to.equal(5000);

            // update royalties with valid receivers but rates set to zero
            await multipleRoyalties.setTokenRoyalties(0, receivers, [0,0,0]);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(undefined);
            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[0][2]).to.equal(undefined);

            expect(tokenFees[1][0]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
            expect(tokenFees[1][2]).to.equal(undefined);

            // reset royalties to normal
            await multipleRoyalties.setTokenRoyalties(0, receivers, rates);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);
            expect(tokenFees[1][2]).to.equal(5000);

            // update royalties with zero addresses
            var nullReceivers = [ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero]
            await multipleRoyalties.setTokenRoyalties(0, nullReceivers, rates);

            tokenFees = await multipleRoyalties.getMultipleRoyalties(0);
            expect(tokenFees[0][0]).to.equal(undefined);
            expect(tokenFees[0][1]).to.equal(undefined);
            expect(tokenFees[0][2]).to.equal(undefined);
            
            expect(tokenFees[1][0]).to.equal(undefined);
            expect(tokenFees[1][1]).to.equal(undefined);
            expect(tokenFees[1][2]).to.equal(undefined);
        });
    });
});