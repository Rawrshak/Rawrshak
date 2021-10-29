const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const LootboxCredit = artifacts.require("LootboxCredit");
const LootboxByItem = artifacts.require("LootboxByItem");
const LootboxStorageByItem = artifacts.require("LootboxStorageByItem");
const Content = artifacts.require("Content");
const ContentStorage = artifacts.require("ContentStorage");
const ContentManager = artifacts.require("ContentManager");
const AccessControlManager = artifacts.require("AccessControlManager");
//const TestSalvage = artifacts.require("TestSalvage");
const ContractRegistry = artifacts.require("ContractRegistry");
const TagsManager = artifacts.require("TagsManager");
const TruffleAssert = require("truffle-assertions");

contract('Lootbox Contract', (accounts)=> {
    const [
        deployerAddress,            // Address that deployed contracts
        managerAddress,            // platform address fees
        creatorAddress,             // content nft Address
        playerAddress,              // player 1 address
        player2Address,              // player 2 address
    ] = accounts;

    var lootbox;
    var lootboxStorage;
    var asset = [
        [1, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 0, []],
        [2, "arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 100, []],
        [3, "arweave.net/tx/public-Material-1", "arweave.net/tx/private-Material-1",10000, []],
        [4, "arweave.net/tx/public-Material-2", "arweave.net/tx/private-Material-2", 10000, []],
        [5, "arweave.net/tx/public-Material-3", "arweave.net/tx/private-Material-3", 10000, []],
        [6, "arweave.net/tx/public-Reward-1", "arweave.net/tx/private-Reward-1", 0, []],
        [7, "arweave.net/tx/public-Reward-2", "arweave.net/tx/private-Reward-2", 0, []],
    ];

    /*struct CreateData {
        uint256 tokenId;
        string publicDataUri;
        string hiddenDataUri;
        uint256 maxSupply;
        LibRoyalties.Fees[] fees;
    }*/

    var rewards;
    var blueprints;

    var fullProb;
    var halfProb;
    var quarterProb;
    var rareProb;

    // Lootbox Credit Token 
    var lootboxCreditToken;

    var nftAssetData;
    var manager_role;

    const zeroAddress = "0x0000000000000000000000000000000000000000";

    beforeEach(async () => {
        registry = await ContractRegistry.new();
        await registry.__ContractRegistry_init();
        tagsManager = await TagsManager.new();
        await tagsManager.__TagsManager_init(registry.address);

        accessControlManager = await AccessControlManager.new();
        await accessControlManager.__AccessControlManager_init();
        contentStorage = await ContentStorage.new();
        await contentStorage.__ContentStorage_init([[deployerAddress, web3.utils.toWei('0.01', 'ether')]], "arweave.net/tx-contract-uri");
        content = await Content.new();
        await content.__Content_init("Test Content Contract", "TEST", contentStorage.address, accessControlManager.address);
        await contentStorage.setParent(content.address);
        
        // Setup content manager
        contentManager = await ContentManager.new();
        await contentManager.__ContentManager_init(content.address, contentStorage.address, accessControlManager.address, tagsManager.address);
        await contentStorage.grantRole(await contentStorage.OWNER_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.grantRole(await accessControlManager.DEFAULT_ADMIN_ROLE(), contentManager.address, {from: deployerAddress});
        await accessControlManager.setParent(content.address);

        // Add 7 assets
        await contentManager.addAssetBatch(asset);

        nftAssetData = [content.address, 1];

        // Setup Lootbox Credit Token
        lootboxCreditToken = await LootboxCredit.new();
        await lootboxCreditToken.__LootboxCredit_init(web3.utils.toWei('1000000000', 'ether'), "Rawrshak Lootbox Credit", "RAWRLOOT", {from: deployerAddress});

        // Give player 1 10000 Credit tokens
        await lootboxCreditToken.transfer(playerAddress, web3.utils.toWei('10000', 'ether'), {from: deployerAddress});

        // Mint assets
        var mintData = [playerAddress, [1, 2], [10, 10], 1, zeroAddress, []];   // LibAsset.MintData
        await contentManager.mintBatch(mintData, {from: deployerAddress});

        /*struct MintData {
            address to;
            uint256[] tokenIds;
            uint256[] amounts;
            uint256 nonce;
            address signer;
            bytes signature;
        }*/

        // Set contract royalties
        var assetRoyalty = [[creatorAddress, web3.utils.toWei('0.02', 'ether')]];
        await contentManager.setContractRoyalties(assetRoyalty, {from: deployerAddress});

        /*salvage = await TestSalvage.new();
        await salvage.__TestSalvage_init(1000);*/

        // Setup LootboxStorage
        lootboxStorage = await LootboxStorageByItem.new();
        await lootboxStorage.__LootboxStorageByItem_init();
        
        // Setup Lootbox 
        lootbox = await LootboxByItem.new();
        await lootbox.__LootboxByItem_init(1000, lootboxCreditToken.address, lootboxStorage.address);
        manager_role = await lootbox.MANAGER_ROLE();

        // Allow the lootbox contract to be able to burn on the lootbox credit token contract.
        await lootboxCreditToken.grantRole(await lootboxCreditToken.BURNER_ROLE(), lootbox.address, {from: deployerAddress});
        
        // Register the lootbox as a system on the content contract
        var approvalPair = [[lootbox.address, true], [creatorAddress, true]];
        await contentManager.registerOperators(approvalPair, {from: deployerAddress});

        // Register manager
        await lootboxStorage.registerManager(managerAddress, {from: deployerAddress});
        await lootbox.registerManager(managerAddress, {from: deployerAddress});

        // Setup probabilities.
        fullProb = web3.utils.toWei('1', 'ether');
        halfProb = web3.utils.toWei('0.5', 'ether');
        quarterProb = web3.utils.toWei('0.25', 'ether');
        rareProb = web3.utils.toWei('0.1', 'ether');

        rewards = [
            [
                [ [content.address, 1] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 2] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
            [
                [ [content.address, 3] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 4] /*LibCraft.AssetData*/, halfProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 5] /*LibCraft.AssetData*/, rareProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
            [
                [ [content.address, 6] /*LibCraft.AssetData*/, halfProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 7] /*LibCraft.AssetData*/, rareProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
        ];  // LibLootbox.LootboxReward

        /*struct LootboxReward {
            LibCraft.AssetData asset;   // asset to be minted when a Lootbox is burned
            uint256 probability;        // stored in ETH (1 ETH is 100%, 0.5 ETH is 50%, etc)
            uint256 amount;             // amount of asset minted when dice roll probability is met
            uint8   class;              // number signifying the rarity/class that an asset belongs to. the lower the number the more common the asset is. 
                                        // 0 means no class set (i.e. unused). 1 is most common, 2 is uncommon, 3 is rare, etc. What each of these classes
                                        // are called is entirely up to the developer.
        }*/

        /*struct AssetData {
            address content;
            uint256 tokenId;
        }*/

        blueprints = [
            [true /*enabled*/, web3.utils.toWei('50', 'ether') /*cost*/, 2 /*maxAssetsGiven*/, true /*hasGuaranteedItems*/],
            [true /*enabled*/, web3.utils.toWei('100', 'ether') /*cost*/, 3 /*maxAssetsGiven*/, true /*hasGuaranteedItems*/],
            [true /*enabled*/, web3.utils.toWei('25', 'ether') /*cost*/, 2 /*maxAssetsGiven*/, false /*hasGuaranteedItems*/]
        ];

        /*
        struct Blueprint {
            bool enabled;               // whether or not this lootbox can be minted yet
            uint256 cost;               // lootbox credit cost to buy the lootbox
            uint16 maxAssetsGiven;      // Max number of reward items the lootbox will randomly pick from the assets list when burned. Doesn't count guaranteed items.
            bool hasGuaranteedItems;    // Whether or not we have any items that are guaranteed to be given.
        }*/

    });

    it('Check if Lootbox Contract was deployed properly', async () => {
        assert.equal(
            lootbox.address != 0x0,
            true,
            "Lootbox Contract was not deployed properly.");
    });

    it('Add Blueprint to Lootbox Storage', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');
        //console.log(results);
        //console.log(results.logs[0]);
        //console.log("args is next");
        //console.log(results.logs[0].args);

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        console.log("| Blueprint Token Id: " + tokenId);
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Make sure we start with no rewards.
        var lootboxRewards = await lootboxStorage.getRewards(tokenId);
        assert.equal(lootboxRewards.length, 0, "rewards length incorrect");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var lootboxBlueprint = await lootboxStorage.getBlueprint(tokenId);
        console.log("| Enabled: " + lootboxBlueprint.enabled);
        console.log("| MaxAssetsGiven: " + lootboxBlueprint.maxAssetsGiven);
        assert.equal(lootboxBlueprint.maxAssetsGiven, 2, "incorrect max assets");
        console.log("| HasGuaranteedItems: " + lootboxBlueprint.hasGuaranteedItems);
        assert.equal(lootboxBlueprint.hasGuaranteedItems, true, "incorrect guaranteed items");
        //console.log("| Blueprint: ");
        //console.log(lootboxBlueprint);

        var lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        console.log("| Blueprint Cost: " + lootboxCost);
        assert.notEqual(lootboxCost, 0x0, "Cost is empty");
        assert.equal(lootboxCost, web3.utils.toWei('50', 'ether'), "incorrect cost");

        var lootboxRewards = await lootboxStorage.getRewards(tokenId);
        console.log("| Blueprint Number of Rewards: " + lootboxRewards.length);
        assert.equal(lootboxRewards.length, 2, "rewards length incorrect");

        for (var i = 0; i < lootboxRewards.length; ++i) {
            assert.equal(lootboxRewards[i].asset.content, content.address, "Invalid Reward Address");
            assert.equal(lootboxRewards[i].probability, web3.utils.toWei('1', 'ether'), "Invalid Reward probability");
        }
    });

    it('Mint Blueprint in Lootbox Storage', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        var balance = await lootboxCreditToken.balanceOf(playerAddress);
        assert.equal(
            balance.valueOf().toString(),
            web3.utils.toWei('9950', 'ether').toString(),
            "Player's Lootbox Credit Incorrect");

        var balanceLootbox = await lootbox.balanceOf(playerAddress, tokenId);
        assert.equal(
            balanceLootbox.valueOf().toString(),
            1,
            "Player's Lootbox Amount Incorrect");
    });

    it('Burn Blueprint', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[0][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        var results = await lootbox.burn(tokenId, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxOpened');

        var balanceLootbox = await lootbox.balanceOf(playerAddress, tokenId);
        assert.equal(
            balanceLootbox.valueOf().toString(),
            0,
            "Player's Lootbox Amount Incorrect");

        var balanceAsset = await content.balanceOf(playerAddress, 1);
        assert.equal(balanceAsset.valueOf().toString(), 11, "Asset was not minted");

        var balanceAsset = await content.balanceOf(playerAddress, 2);
        assert.equal(balanceAsset.valueOf().toString(), 11, "Asset was not minted");
    });

    it('Burn Blueprint 2', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[1][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[1][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[1][2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        var balance = await lootboxCreditToken.balanceOf(playerAddress);
        assert.equal(
            balance.valueOf().toString(),
            web3.utils.toWei('9900', 'ether').toString(),
            "Player's Lootbox Credit Incorrect");

        var results = await lootbox.burn(tokenId, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxOpened');
        //console.log(results);
        //console.log(results.logs.length);
        //console.log(results.logs[results.logs.length - 1]);

        var balanceLootbox = await lootbox.balanceOf(playerAddress, tokenId);
        assert.equal(
            balanceLootbox.valueOf().toString(),
            0,
            "Player's Lootbox Amount Incorrect");

        var balanceAsset = await content.balanceOf(playerAddress, 3);
        assert.equal(balanceAsset.valueOf().toString(), 1, "Asset 3 was not minted");
        console.log("| balanceof(3):  " + balanceAsset.valueOf().toString());

        var balanceAsset = await content.balanceOf(playerAddress, 4);
        console.log("| balanceof(4):  " + balanceAsset.valueOf().toString());

        var balanceAsset = await content.balanceOf(playerAddress, 5);
        console.log("| balanceof(5):  " + balanceAsset.valueOf().toString());

        // The LootboxOpened event will always be the last one when calling mint().
        var numAssetsGiven = results.logs[results.logs.length - 1].args.numAssetsGiven.toString();
        assert.notEqual(numAssetsGiven, 0x0, "numAssetsGiven is empty");
        console.log("| Number of Rewards Given: " + numAssetsGiven);
    });

    it('Burn Blueprint 3', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        var balance = await lootboxCreditToken.balanceOf(playerAddress);
        assert.equal(
            balance.valueOf().toString(),
            web3.utils.toWei('9975', 'ether').toString(),
            "Player's Lootbox Credit Incorrect");

        var results = await lootbox.burn(tokenId, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxOpened');
        //console.log(results);
        //console.log(results.logs.length);
        //console.log(results.logs[results.logs.length - 1]);

        var balanceLootbox = await lootbox.balanceOf(playerAddress, tokenId);
        assert.equal(
            balanceLootbox.valueOf().toString(),
            0,
            "Player's Lootbox Amount Incorrect");

        var balanceAsset = await content.balanceOf(playerAddress, 6);
        console.log("| balanceof(6):  " + balanceAsset.valueOf().toString());

        var balanceAsset = await content.balanceOf(playerAddress, 7);
        console.log("| balanceof(7):  " + balanceAsset.valueOf().toString());

        // The LootboxOpened event will always be the last one when calling mint().
        var numAssetsGiven = results.logs[results.logs.length - 1].args.numAssetsGiven.toString();
        console.log("| Number of Rewards Given: " + numAssetsGiven);
    });

    it('Do not let broke user mint lootbox', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        await TruffleAssert.fails(
            lootbox.mint(tokenId, 1, {from: player2Address}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Operations stop working when entire lootbox system paused and operations resume when unpaused', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Pause the lootbox contract.
        await lootbox.managerSetPause(true, {from: managerAddress});

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        await TruffleAssert.fails(
            lootbox.mint(tokenId, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Unpause the lootbox contract so we can mint one, to pause again and test failing on burning.
        await lootbox.managerSetPause(false, {from: managerAddress});

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        // Pause the lootbox contract.
        await lootbox.managerSetPause(true, {from: managerAddress});

        await TruffleAssert.fails(
            lootbox.burn(tokenId, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Operations stop working when single lootbox blueprint disabled and operations resume when re-enabled', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        // Pause the specific lootbox contract.
        await lootboxStorage.setBlueprintEnabled(tokenId, false, {from: managerAddress});

        await TruffleAssert.fails(
            lootbox.mint(tokenId, 1, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        // Unpause the lootbox contract so we can mint one, to pause again and test failing on burning.
        await lootboxStorage.setBlueprintEnabled(tokenId, true, {from: managerAddress});

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        // Pause the lootbox contract.
        await lootboxStorage.setBlueprintEnabled(tokenId, false, {from: managerAddress});

        await TruffleAssert.fails(
            lootbox.burn(tokenId, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Test setting blueprint cost', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        assert.notEqual(lootboxCost, 0x0, "Cost is empty");
        assert.equal(lootboxCost, web3.utils.toWei('25', 'ether'), "incorrect cost");

        // Change the cost of the blueprint.
        await lootboxStorage.setBlueprintCost(tokenId, web3.utils.toWei('33', 'ether'), {from: managerAddress});

        lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        assert.equal(lootboxCost, web3.utils.toWei('33', 'ether'), "incorrect changed cost");

        var results = await lootbox.mint(tokenId, 1, {from: playerAddress});
        TruffleAssert.eventEmitted(results, 'LootboxCreated');

        var balance = await lootboxCreditToken.balanceOf(playerAddress);
        assert.equal(
            balance.valueOf().toString(),
            web3.utils.toWei('9967', 'ether').toString(),
            "Player's Lootbox Credit Incorrect");
    });

    it('Test setting max rewards', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var lootboxNumRewards = await lootboxStorage.getMaxRewardAssetsGiven(tokenId);
        lootboxNumRewards = lootboxNumRewards.toString();
        assert.notEqual(lootboxNumRewards, 0x0, "Max Rewards is empty");
        assert.equal(lootboxNumRewards, 2, "incorrect max rewards");

        // Change the max rewards of the blueprint.
        await lootboxStorage.setMaxRewardAssetsGiven(tokenId, 3, {from: managerAddress});

        var lootboxNumRewards = await lootboxStorage.getMaxRewardAssetsGiven(tokenId);
        lootboxNumRewards = lootboxNumRewards.toString();
        assert.equal(lootboxNumRewards, 3, "incorrect changed max rewards");
    });

    it('Test clearing rewards', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var lootboxNumRewards = await lootboxStorage.getNumAddedRewards(tokenId);
        lootboxNumRewards = lootboxNumRewards.toString();
        assert.notEqual(lootboxNumRewards, 0x0, "Num Rewards is empty");
        assert.equal(lootboxNumRewards, 2, "incorrect num rewards");

        await lootboxStorage.clearLootboxRewards(tokenId, {from: managerAddress});

        lootboxNumRewards = await lootboxStorage.getNumAddedRewards(tokenId);
        lootboxNumRewards = lootboxNumRewards.toString();
        assert.equal(lootboxNumRewards, 0, "incorrect changed num rewards");
    });

    it('Fail adding rewards as non-manager', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards as a player.
        await TruffleAssert.fails(
            lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Fail clearing rewards as non-manager', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // Add some rewards.
        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][0], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        var results = await lootboxStorage.addLootboxReward(tokenId, rewards[2][1], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintRewardAdded');

        await TruffleAssert.fails(
            lootboxStorage.clearLootboxRewards(tokenId, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Fail disabling blueprint as non-manager', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        // As a player, try to disable a blueprint.
        await TruffleAssert.fails(
            lootboxStorage.setBlueprintEnabled(tokenId, false, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Fail adding blueprint as non-manager', async () => {
        await TruffleAssert.fails(
            lootboxStorage.setBlueprint(blueprints[2], {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    it('Fail changing blueprint as non-manager', async () => {
        var results = await lootboxStorage.setBlueprint(blueprints[2], {from: managerAddress});
        TruffleAssert.eventEmitted(results, 'BlueprintUpdated');

        // results.logs[0].args are the arguments sent forth in the BlueprintUpdated event.
        var tokenId = results.logs[0].args.tokenId.toString();
        assert.notEqual(tokenId, 0x0, "Id is empty");

        await TruffleAssert.fails(
            lootboxStorage.setBlueprintCost(tokenId, web3.utils.toWei('25', 'ether'), {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );

        await TruffleAssert.fails(
            lootboxStorage.setMaxRewardAssetsGiven(tokenId, 10, {from: playerAddress}),
            TruffleAssert.ErrorType.REVERT
        );
    });

    // TODO: Test against invalid data inputs.
    // TODO: Change test case to have an amount set to > 1
    // TODO: Test reentrancy of mint/burn functions?

});
