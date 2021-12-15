const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Multiple Royalties Contract Tests', () => {
    var multipleRoyalties
    var developerAddress, deployerAddress, deployerAltAddress, receiverAddress;
    var TestMultipleRoyalties;

    before(async () => {
        [developerAddress, deployerAddress, deployerAltAddress, receiverAddress] = await ethers.getSigners();
        TestMultipleRoyalties = await ethers.getContractFactory("TestMultipleRoyalties");
    });
    
    beforeEach(async () => {
        multipleRoyalties = await upgrades.deployProxy(TestMultipleRoyalties);
    });

    describe("Token Royalties", () => {
        it('Set Token Royalties', async () => {
            var receivers = [developerAddress.address, deployerAddress.address, receiverAddress.address];
            var rates = [20000, 10000, 5000];

            await expect(multipleRoyalties.setTokenRoyalties(0, receivers, rates))
                .to.emit(multipleRoyalties, 'TokenRoyaltiesUpdated')
                .withArgs(0, receivers, rates);

            var tokenFees = await multipleRoyalties.multipleRoyaltyInfo(0);
            expect(tokenFees[0][0]).to.equal(developerAddress.address);
            expect(tokenFees[0][1]).to.equal(deployerAddress.address);
            expect(tokenFees[0][2]).to.equal(receiverAddress.address);

            expect(tokenFees[1][0]).to.equal(20000);
            expect(tokenFees[1][1]).to.equal(10000);
            expect(tokenFees[1][2]).to.equal(5000);
        });

        it('Verify Royalties', async () => {
            var receivers1 = [developerAddress.address, deployerAddress.address, receiverAddress.address];
            var rates1 = [20000, 10000, 10000];

            var receivers2 = [developerAddress.address, deployerAltAddress.address];
            var rates2 = [10000, 30000];

            await multipleRoyalties.verifyRoyalties(receivers1, rates1);
            await multipleRoyalties.verifyRoyalties(receivers2, rates2);
        });

        it('Invalid Royalties', async () => {
            var receivers = [developerAddress.address, deployerAddress.address, receiverAddress.address];
            var rates1 = [500000, 500000, 1];
            var rates2 = [10000, 30000, 20000, 10000];
            var rates3 = [20000, 5000];

            await expect(multipleRoyalties.verifyRoyalties(receivers, rates1)).to.be.reverted;
            await expect(multipleRoyalties.verifyRoyalties(receivers, rates2)).to.be.reverted;
            await expect(multipleRoyalties.verifyRoyalties(receivers, rates3)).to.be.reverted;
        });
    });
});