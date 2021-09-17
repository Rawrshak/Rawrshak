const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const AccessControlManager = artifacts.require("AccessControlManager");
const ContentManager = artifacts.require("ContentManager");
const ContentFactory = artifacts.require("ContentFactory");

contract('Content Clone Factory Tests', (accounts) => {
    const [
        deployerAddress,            // Address that deployed contracts
        developer1Address,          // Address that belongs to Developer 1
        developer2Address,          // Address that belongs to Developer 2
    ] = accounts;

    beforeEach(async () => {
        accessControlManager = await AccessControlManager.new();
        content = await Content.new();
        contentStorage = await ContentStorage.new();
        contentManager = await ContentManager.new();
        contentFactory = await ContentFactory.new();

        // Initialize Clone Factory
        await contentFactory.__ContentFactory_init(
            content.address,
            contentManager.address,
            contentStorage.address,
            accessControlManager.address);
    });

    it('Properly Initialized Clone Factory', async () => {
        // Check initializer parameters
        assert.equal(
            await contentFactory.contentImplementation(),
            content.address,
            "Content Contract original is not correct");
        assert.equal(
            await contentFactory.contentManagerImplementation(),
            contentManager.address,
            "Content Manager Contract original is not correct");
        assert.equal(
            await contentFactory.contentStorageImplementation(),
            contentStorage.address,
            "Content Storage Contract original is not correct");
        assert.equal(
            await contentFactory.accessControlManagerImplementation(),
            accessControlManager.address,
            "Access Control Manager Contract original is not correct");
    });

    it('Create Content Contracts - Simple', async () => {
        // Check initializer parameters
        var uri = "arweave.net/tx-contract-uri";

        var result = await contentFactory.createContracts(
            [[deployerAddress, 10000]],
            uri);

        // // To figure out which log contains the ContractDeployed event
        // console.log(result.logs);

        var cloneContent = await Content.at(result.logs[2].args.content);
        var cloneContentManager = await ContentManager.at(result.logs[2].args.contentManager);
    
        assert.notEqual(cloneContent.address, content.address, "clone address should not be the same");
        assert.notEqual(cloneContentManager.address, contentManager.address, "clone address should not be the same");

        assert.equal(await cloneContent.contractUri(), uri, "Contract URI is incorrect.");
        assert.equal(await cloneContentManager.owner(), deployerAddress, "Ownership of Content Manager was not transferred.");
        
        assert.equal(await contentFactory.contentExists(cloneContent.address), true, "Content was not stored properly.");
        assert.equal(await contentFactory.contentManagerExists(cloneContentManager.address), true, "Content was not stored properly.");
    });

    it('Create Content Contracts from different developers', async () => {
        // Check initializer parameters
        var uri1 = "arweave.net/tx-contract-uri";
        var uri2 = "arweave.net/tx-contract-uri-2";

        // developer 1 launches contracts
        var contract1Result = await contentFactory.createContracts(
            [[developer1Address, 10000]],
            uri1,
            {from: developer1Address});

        var dev1Content = await Content.at(contract1Result.logs[2].args.content);
        var dev1ContentManager = await ContentManager.at(contract1Result.logs[2].args.contentManager);

        // developer 2 launches contracts
        var contract2Result = await contentFactory.createContracts(
            [[developer2Address, 10000]],
            uri2,
            {from: developer2Address});

        var dev2Content = await Content.at(contract2Result.logs[2].args.content);
        var dev2ContentManager = await ContentManager.at(contract2Result.logs[2].args.contentManager);

        // Checks if the addresses are not the same
        assert.notEqual(dev1Content.address, dev2Content.address, "Factory is using the same contract address for Content");
        assert.notEqual(dev1ContentManager.address, dev2ContentManager.address, "Factory is using the same contract address for Content Manager");

        // URIs should not be the same
        assert.notEqual(await dev1Content.contractUri(), await dev2Content.contractUri(), "Uris should not be the same");
    });
});
