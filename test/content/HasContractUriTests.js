const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('HasContractUri Contract Tests', () => {
    var testContract;

    beforeEach(async () => {
        const TestHasContractUri = await ethers.getContractFactory("TestHasContractUri");
        testContract = await upgrades.deployProxy(TestHasContractUri, [""]); 
    });

    describe("Basic HasContractUri tests", () => {
        it('Check default Contract Uri', async () => {
            expect(await testContract.contractUri()).to.equal("");
        });
        
        it('Non-empty string default uri', async () => {
            const TestHasContractUri = await ethers.getContractFactory("TestHasContractUri");
            testContract = await upgrades.deployProxy(TestHasContractUri, ["ipfs:/TestContractInfo.json"]); 
            expect(await testContract.contractUri())
                .to.equal("ipfs:/TestContractInfo.json");
        });
        
        it('Setting the default contract uri', async () => {
            await testContract.setContractUri("ipfs:/TestContractInfo.json");
            expect(await testContract.contractUri())
                .to.equal("ipfs:/TestContractInfo.json");
        });
        
        it('Setting the default contract uri to null string', async () => {
            await testContract.setContractUri("ipfs:/TestContractInfo.json");
            await testContract.setContractUri("");
            expect(await testContract.contractUri()).to.equal("");
        });
    });
});
