const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AddressResolver = artifacts.require("AddressResolver");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const TruffleAssert = require("truffle-assertions");

contract('Address resolver Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
    ] = accounts;
    var resolver;
    var escrowNFTs;
    var escrowNFTs2;

    beforeEach(async () => {
        resolver = await AddressResolver.new();
        await resolver.__AddressResolver_init({from: deployerAddress});
        escrowNFTs = await EscrowNFTs.new();
        await escrowNFTs.__EscrowNFTs_init({from: deployerAddress});
        escrowNFTs2 = await EscrowNFTs.new();
        await escrowNFTs2.__EscrowNFTs_init({from: deployerAddress});
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
        var ids = ["0x00000001"];
        var addresses = [escrowNFTs.address];

        TruffleAssert.eventEmitted(
            await resolver.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );
        assert.equal(
            await resolver.getAddress("0x00000001"),
            escrowNFTs.address,
            "Incorrect address returned."
        );
    });
    
    it('Register multiple contracts', async () => {
        var ids = ["0x00000001", "0x00000002"];
        var addresses = [escrowNFTs.address, escrowNFTs2.address];

        TruffleAssert.eventEmitted(
            await resolver.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );

        assert.equal(
            await resolver.getAddress("0x00000001"),
            escrowNFTs.address,
            "Incorrect address returned."
        );
        
        assert.equal(
            await resolver.getAddressWithCheck("0x00000002"),
            escrowNFTs2.address,
            "Incorrect address returned."
        );
    });
 
    it('Register test input length mismatch', async () => {
        var ids = ["0x00000001", "0x00000002"];
        var addresses = [escrowNFTs.address];
        
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
