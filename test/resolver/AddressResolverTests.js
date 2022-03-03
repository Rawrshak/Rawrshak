const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Address Resolver Contract tests', () => {
    var deployerAddress;
    var resolver;

    before(async () => {
        [deployerAddress] = await ethers.getSigners();
        AddressResolver = await ethers.getContractFactory("AddressResolver");
        MockToken = await ethers.getContractFactory("MockToken");
        CollectionFactory = await ethers.getContractFactory("CollectionFactory");
    });

    beforeEach(async () => {
        resolver = await upgrades.deployProxy(AddressResolver, []);
        rawr = await upgrades.deployProxy(MockToken, ["Rawrshak Token", "RAWR"]);

        // Initialize Collection Clone Factory
        collectionFactory = await upgrades.deployProxy(CollectionFactory, [deployerAddress.address, deployerAddress.address, deployerAddress.address, deployerAddress.address]);
    });

    describe("Basic Tests", () => {
        it('Check if address resolver was deployed properly', async () => {
            expect(resolver.address).not.equal(ethers.constants.Address);
        });

        it('Supports the Address resolver Interface', async () => {
            expect(await resolver.supportsInterface("0x9c7ff313")).to.equal(true);
        });
    });

    describe("Register Contracts", () => {
        it('Register a single contract', async () => {    
            // CONTRACT_NFT_ESCROW
            var ids = ["0x3d13c043"];
            var addresses = [rawr.address];
    
            await expect(await resolver.registerAddress(ids, addresses))
                .to.emit(resolver, 'AddressRegistered');

            expect(await resolver.getAddress("0x3d13c043")).to.equal(rawr.address);
        });
    
        it('Register multiple contracts', async () => {
            var ids = ["0x3d13c043", "0xdb337f7d"];
            var addresses = [rawr.address, collectionFactory.address];
    
            await expect(await resolver.registerAddress(ids, addresses))
                .to.emit(resolver, 'AddressRegistered');
    
            expect(await resolver.getAddress("0x3d13c043")).to.equal(rawr.address);
            expect(await resolver.getAddress("0xdb337f7d")).to.equal(collectionFactory.address);
        });
     
        it('Register test input length mismatch', async () => {
            var ids = ["0x3d13c043", "0xdb337f7d"];
            var addresses = [rawr.address];
            
            await expect(resolver.registerAddress(ids, addresses)).to.be.reverted;
            await expect(resolver.registerAddress([], addresses)).to.be.reverted;
        });
     
        it('Invalid id', async () => {
            await expect(resolver.getAddressWithCheck("0x00000001")).to.be.reverted;
        });
    });
});
