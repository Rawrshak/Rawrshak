const { expect, assert } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe('Address Resolver Contract tests', () => {
    var deployerAddress;
    var resolver;

    before(async () => {
        [deployerAddress] = await ethers.getSigners();
        AddressResolver = await ethers.getContractFactory("AddressResolver");
    });

    beforeEach(async () => {
        resolver = await upgrades.deployProxy(AddressResolver, []);
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
            NftEscrow = await ethers.getContractFactory("NftEscrow");
            nftEscrow = await upgrades.deployProxy(NftEscrow, []);
    
            // CONTRACT_NFT_ESCROW
            var ids = ["0x87d4498b"];
            var addresses = [nftEscrow.address];
    
            await expect(await resolver.registerAddress(ids, addresses))
                .to.emit(resolver, 'AddressRegistered');

            expect(await resolver.getAddress("0x87d4498b")).to.equal(nftEscrow.address);
        });
    
        it('Register multiple contracts', async () => {
            NftEscrow = await ethers.getContractFactory("NftEscrow");
            nftEscrow = await upgrades.deployProxy(NftEscrow, []);
            Erc20Escrow = await ethers.getContractFactory("Erc20Escrow");
            escrowToken = await upgrades.deployProxy(Erc20Escrow, []);
    
            var ids = ["0x87d4498b", "0x29a264aa"];
            var addresses = [nftEscrow.address, escrowToken.address];
    
            await expect(await resolver.registerAddress(ids, addresses))
                .to.emit(resolver, 'AddressRegistered');
    
            expect(await resolver.getAddress("0x87d4498b")).to.equal(nftEscrow.address);
            expect(await resolver.getAddress("0x29a264aa")).to.equal(escrowToken.address);
        });
     
        it('Register test input length mismatch', async () => {
            var ids = ["0x87d4498b", "0x29a264aa"];
            NftEscrow = await ethers.getContractFactory("NftEscrow");
            nftEscrow = await upgrades.deployProxy(NftEscrow, []);
            var addresses = [nftEscrow.address];
            
            await expect(resolver.registerAddress(ids, addresses)).to.be.reverted;
            await expect(resolver.registerAddress([], addresses)).to.be.reverted;
        });
     
        it('Invalid id', async () => {
            await expect(resolver.getAddressWithCheck("0x00000001")).to.be.reverted;
        });
    });
});
