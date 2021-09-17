const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AddressResolver = artifacts.require("AddressResolver");
const NftEscrow = artifacts.require("NftEscrow");
const Erc20Escrow = artifacts.require("Erc20Escrow");
const TruffleAssert = require("truffle-assertions");

contract('Address Resolver Contract tests', (accounts) => {
    const [
        deployerAddress             // Address that deployed contracts
    ] = accounts;
    var resolver;

    beforeEach(async () => {
        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});
    });

    it('Check if address resolver was deployed properly', async () => {
        assert.equal(
            resolver.address != 0x0,
            true,
            "Address resolver was not deployed properly.");
    });

    it('Supports the Address resolver Interface', async () => {
        assert.equal(
            await resolver.supportsInterface("0x00000006"),
            true, 
            "The resolver doesn't support the Address resolver interface");
    });

    it('Register a single contract', async () => {
        var nftEscrow = await NftEscrow.new();
        await nftEscrow.__NftEscrow_init({from: deployerAddress});

        // CONTRACT_NFT_ESCROW
        var ids = ["0x87d4498b"];
        var addresses = [nftEscrow.address];

        TruffleAssert.eventEmitted(
            await resolver.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );
        assert.equal(
            await resolver.getAddress("0x87d4498b"),
            nftEscrow.address,
            "Incorrect address returned."
        );
    });
    
    it('Register multiple contracts', async () => {
        var nftEscrow = await NftEscrow.new();
        await nftEscrow.__NftEscrow_init({from: deployerAddress});
        var escrowToken = await Erc20Escrow.new();
        await escrowToken.__Erc20Escrow_init({from: deployerAddress});

        var ids = ["0x87d4498b", "0x29a264aa"];
        var addresses = [nftEscrow.address, escrowToken.address];

        TruffleAssert.eventEmitted(
            await resolver.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );

        assert.equal(
            await resolver.getAddress("0x87d4498b"),
            nftEscrow.address,
            "Incorrect address returned."
        );
        
        assert.equal(
            await resolver.getAddressWithCheck("0x29a264aa"),
            escrowToken.address,
            "Incorrect address returned."
        );
    });
 
    it('Register test input length mismatch', async () => {
        var ids = ["0x87d4498b", "0x29a264aa"];
        var nftEscrow = await NftEscrow.new();
        await nftEscrow.__NftEscrow_init({from: deployerAddress});
        var addresses = [nftEscrow.address];
        
        await TruffleAssert.fails(
            resolver.registerAddress(ids, addresses, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            resolver.registerAddress([], addresses, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
 
    it('Invalid id', async () => {
        await TruffleAssert.fails(
            resolver.getAddressWithCheck("0x00000001"),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
