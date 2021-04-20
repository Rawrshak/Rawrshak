const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const AddressRegistry = artifacts.require("AddressRegistry");
const EscrowNFTs = artifacts.require("EscrowNFTs");
const TruffleAssert = require("truffle-assertions");

contract('Address Registry Contract', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
    ] = accounts;
    var registry;
    var escrowNFTs;
    var escrowNFTs2;

    beforeEach(async () => {
        registry = await AddressRegistry.new();
        await registry.__AddressRegistry_init({from: deployerAddress});
        escrowNFTs = await EscrowNFTs.new();
        await escrowNFTs.__EscrowNFTs_init({from: deployerAddress});
        escrowNFTs2 = await EscrowNFTs.new();
        await escrowNFTs2.__EscrowNFTs_init({from: deployerAddress});
    });

    it('Check if address registry was deployed properly', async () => {
        assert.equal(
            registry.address != 0x0,
            true,
            "Address Registry was not deployed properly.");
    });

    it('Supports the Address Registry Interface', async () => {
        assert.equal(
            await registry.supportsInterface("0x00000006"),
            true, 
            "The registry doesn't support the Address Registry interface");
    });

    it('Register a single contract', async () => {
        var ids = ["0x00000001"];
        var addresses = [escrowNFTs.address];

        TruffleAssert.eventEmitted(
            await registry.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );
        assert.equal(
            await registry.getAddress("0x00000001"),
            escrowNFTs.address,
            "Incorrect address returned."
        );
    });
    
    it('Register multiple contracts', async () => {
        var ids = ["0x00000001", "0x00000002"];
        var addresses = [escrowNFTs.address, escrowNFTs2.address];

        TruffleAssert.eventEmitted(
            await registry.registerAddress(ids, addresses, {from: deployerAddress}),
            'AddressRegistered'
        );

        assert.equal(
            await registry.getAddress("0x00000001"),
            escrowNFTs.address,
            "Incorrect address returned."
        );
        
        assert.equal(
            await registry.getAddressWithCheck("0x00000002"),
            escrowNFTs2.address,
            "Incorrect address returned."
        );
    });
 
    it('Register test input length mismatch', async () => {
        var ids = ["0x00000001", "0x00000002"];
        var addresses = [escrowNFTs.address];
        
        await TruffleAssert.fails(
            registry.registerAddress(ids, addresses, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
        
        await TruffleAssert.fails(
            registry.registerAddress([], addresses, {from: deployerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });
 
    it('Invalid id', async () => {
        await TruffleAssert.fails(
            registry.getAddressWithCheck("0x00000001"),
            TruffleAssert.ErrorType.REVERT
        );
    });

});
