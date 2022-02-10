const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Lootbox Contract', () => {
    var deployerAddress, managerAddress, creatorAddress, playerAddress, player2Address;
    var contentFactory;
    var contentManager;
    var accessControlManager;
    var AccessControlManager, ContentManager, ContentStorage, Content, L2NativeRawrshakERC20Token, LootboxByItem, LootboxStorageByItem;

    var l2Bridge = "0x50EB44e3a68f1963278b4c74c6c343508d31704C";

    var lootbox;
    var lootboxStorage;
    var lootboxCreditToken;

    var rewards;
    var blueprints;

    var fullProb;
    var halfProb;
    var quarterProb;
    var rareProb;

    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    before(async () => {
        [deployerAddress, managerAddress, creatorAddress, playerAddress, player2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        L2NativeRawrshakERC20Token = await ethers.getContractFactory("L2NativeRawrshakERC20Token");
        LootboxByItem = await ethers.getContractFactory("LootboxByItem");
        LootboxStorageByItem = await ethers.getContractFactory("LootboxStorageByItem");

        originalAccessControlManager = await AccessControlManager.deploy();
        originalContent = await Content.deploy();
        originalContentStorage = await ContentStorage.deploy();
        originalContentManager = await ContentManager.deploy();

        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);
    });

    beforeEach(async () => {
        // Setup LootboxStorage
        lootboxStorage = await upgrades.deployProxy(LootboxStorageByItem, []);

        lootboxCreditToken = await L2NativeRawrshakERC20Token.deploy(l2Bridge, "Rawrshak Lootbox Credit", "RAWRLOOT", ethers.BigNumber.from(100000000).mul(_1e18));
        await lootboxCreditToken.grantRole(await lootboxCreditToken.MINTER_ROLE(), deployerAddress.address);
        await lootboxCreditToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
        
        // Setup Lootbox 
        lootbox = await upgrades.deployProxy(LootboxByItem, [1000, lootboxCreditToken.address, lootboxStorage.address]);

        await createContentContract();
        await createLootboxContract();
    });

    async function createContentContract() {
        var uri = "arweave.net/tx-contract-uri";

        // deploy contracts
        var tx = await contentFactory.createContracts(deployerAddress.address, 10000, uri);
        var receipt = await tx.wait();
        var deployedContracts = receipt.events?.filter((x) => {return x.event == "ContractsDeployed"});

        // To figure out which log contains the ContractDeployed event
        content = await Content.attach(deployedContracts[0].args.content);
        contentManager = await ContentManager.attach(deployedContracts[0].args.contentManager);

        // Type LibAsset.CreateData
        var assets = [
            ["arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 0, deployerAddress.address, 20000],
            ["arweave.net/tx/public-SalvageItem-1", "arweave.net/tx/private-SalvageItem-1", 100, deployerAddress.address, 0],
            ["arweave.net/tx/public-Material-1", "arweave.net/tx/private-Material-1", 10000, deployerAddress.address, 150],
            ["arweave.net/tx/public-Material-2", "arweave.net/tx/private-Material-2", 10000, deployerAddress.address, 200],
            ["arweave.net/tx/public-Material-3", "arweave.net/tx/private-Material-3", 10000, deployerAddress.address, 250],
            ["arweave.net/tx/public-Reward-1", "arweave.net/tx/private-Reward-1", 0, deployerAddress.address, 300],
            ["arweave.net/tx/public-Reward-2", "arweave.net/tx/private-Reward-2", 0, deployerAddress.address, 350],
        ];

        // Add assets
        await contentManager.addAssetBatch(assets);

        // Mint assets
        // Type of LibAsset.MintData
        var mintData = [playerAddress.address, [0, 1], [10, 10], 0, ethers.constants.AddressZero, []];
        
        var approvalPair = [[deployerAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        await content.mintBatch(mintData);
    }

    async function createLootboxContract() {
        // Allow the lootbox contract to be able to burn on the lootbox credit token contract.
        await lootboxCreditToken.grantRole(await lootboxCreditToken.BURNER_ROLE(), lootbox.address);

        // Give player 1 10000 Credit tokens
        var results = await lootboxCreditToken.approve(playerAddress.address, ethers.BigNumber.from(10000).mul(_1e18));
        await expect(results).to.emit(lootboxCreditToken, 'Approval');
        await lootboxCreditToken.transfer(playerAddress.address, ethers.BigNumber.from(10000).mul(_1e18));
        
        // Register the lootbox as a system on the content contract
        var approvalPair = [[lootbox.address, true], [creatorAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Register manager
        await lootboxStorage.registerManager(managerAddress.address);
        await lootbox.registerManager(managerAddress.address);

        // Setup probabilities.
        fullProb =   1000000;
        halfProb =    500000;
        quarterProb = 250000;
        rareProb =    100000;

        // Each entry is type LibLootbox.LootboxReward
        rewards = [
            [
                [ [content.address, 0] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 1] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
            [
                [ [content.address, 2] /*LibCraft.AssetData*/, fullProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 3] /*LibCraft.AssetData*/, halfProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 4] /*LibCraft.AssetData*/, rareProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
            [
                [ [content.address, 5] /*LibCraft.AssetData*/, halfProb /*probability*/, 1 /*amount*/, 0 /*class*/],
                [ [content.address, 6] /*LibCraft.AssetData*/, rareProb /*probability*/, 1 /*amount*/, 0 /*class*/]
            ],
        ];  

        // Each entry is type LibLootbox.Blueprint
        blueprints = [
            [true /*enabled*/, ethers.BigNumber.from(50).mul(_1e18) /*cost*/, 2 /*maxAssetsGiven*/, true /*hasGuaranteedItems*/],
            [true /*enabled*/, ethers.BigNumber.from(100).mul(_1e18) /*cost*/, 3 /*maxAssetsGiven*/, true /*hasGuaranteedItems*/],
            [true /*enabled*/, ethers.BigNumber.from(25).mul(_1e18) /*cost*/, 2 /*maxAssetsGiven*/, false /*hasGuaranteedItems*/]
        ];
    }

    it('Check if Lootbox Contract was deployed properly', async () => {
        expect(lootbox.address != 0x0, "Lootbox Contract was not deployed properly.").to.equal(true);
    });

    it('Add Blueprint to Lootbox Storage', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');
        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;

        // Make sure we start with no rewards.
        var lootboxRewards = await lootboxStorage.getRewards(tokenId);
        expect(lootboxRewards.length, "Rewards length incorrect").to.be.equal(0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var lootboxBlueprint = await lootboxStorage.getBlueprint(tokenId);
        console.log("| Enabled: " + lootboxBlueprint.enabled);
        console.log("| MaxAssetsGiven: " + lootboxBlueprint.maxAssetsGiven);
        expect(lootboxBlueprint.maxAssetsGiven, "Incorrect max assets").to.be.equal(2);
        console.log("| HasGuaranteedItems: " + lootboxBlueprint.hasGuaranteedItems);
        expect(lootboxBlueprint.hasGuaranteedItems, "Incorrect guaranteed items").to.be.equal(true);
        console.log("| Blueprint: ");
        console.log(lootboxBlueprint);

        var lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        console.log("| Blueprint Cost: " + lootboxCost);
        expect(lootboxCost, "Cost is empty").to.not.equal(0x0);
        expect(lootboxCost, "Incorrect cost").to.be.equal(ethers.BigNumber.from(50).mul(_1e18));

        var lootboxRewards = await lootboxStorage.getRewards(tokenId);
        console.log("| Blueprint Number of Rewards: " + lootboxRewards.length);
        expect(lootboxRewards.length, "Rewards length incorrect").to.be.equal(2);

        for (var i = 0; i < lootboxRewards.length; ++i) {
            expect(lootboxRewards[i].asset.content, "Invalid Reward Address").to.be.equal(content.address);
            expect(lootboxRewards[i].probability, "Invalid Reward probability").to.be.equal(fullProb);
        }
    });

    it('Mint Blueprint in Lootbox Storage', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        expect(await lootboxCreditToken.balanceOf(playerAddress.address), "Player's Lootbox Credit Incorrect").to.be.equal(ethers.BigNumber.from(9950).mul(_1e18));
        expect(await lootbox.balanceOf(playerAddress.address, tokenId), "Player's Lootbox Amount Incorrect").to.be.equal(1);
    });

    it('Burn Blueprint', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[0][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        var results = await lootbox.connect(playerAddress).burn(tokenId);
        await expect(results).to.emit(lootbox, 'LootboxOpened');

        expect(await lootbox.balanceOf(playerAddress.address, tokenId), "Player's Lootbox Amount Incorrect").to.be.equal(0);
        expect(await content.balanceOf(playerAddress.address, 0), "Asset 1 was not minted").to.be.equal(11);
        expect(await content.balanceOf(playerAddress.address, 1), "Asset 2 was not minted").to.be.equal(11);
    });

    it('Burn Blueprint 2', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[1][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[1][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[1][2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        expect(await lootboxCreditToken.balanceOf(playerAddress.address), "Player's Lootbox Credit Incorrect").to.be.equal(ethers.BigNumber.from(9900).mul(_1e18));
        var balance = await lootboxCreditToken.balanceOf(playerAddress.address);

        var results = await lootbox.connect(playerAddress).burn(tokenId);
        await expect(results).to.emit(lootbox, 'LootboxOpened');

        var receipt = await results.wait();
        var lootboxOpenedEvent = receipt.events?.filter((x) => {return x.event == "LootboxOpened"});

        expect(await lootbox.balanceOf(playerAddress.address, tokenId), "Player's Lootbox Amount Incorrect").to.be.equal(0);
        var balanceAsset = await content.balanceOf(playerAddress.address, 2);
        expect(balanceAsset.valueOf(), "Asset 3 was not minted").to.be.equal(1);

        var numAssetsGiven = lootboxOpenedEvent[0].args.numAssetsGiven;
        expect(numAssetsGiven, "numAssetsGiven is empty").to.not.equal(0x0);
        console.log("| Number of Rewards Given: " + numAssetsGiven);
    });

    it('Burn Blueprint 3', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        expect(await lootboxCreditToken.balanceOf(playerAddress.address), "Player's Lootbox Credit Incorrect").to.be.equal(ethers.BigNumber.from(9975).mul(_1e18));

        var results = await lootbox.connect(playerAddress).burn(tokenId);
        await expect(results).to.emit(lootbox, 'LootboxOpened');

        var receipt = await results.wait();
        var lootboxOpenedEvent = receipt.events?.filter((x) => {return x.event == "LootboxOpened"});

        expect(await lootbox.balanceOf(playerAddress.address, tokenId), "Player's Lootbox Amount Incorrect").to.be.equal(0);

        var balanceAsset = await content.balanceOf(playerAddress.address, 5);
        console.log("| balanceof(6):  " + balanceAsset.valueOf().toString());

        var balanceAsset = await content.balanceOf(playerAddress.address, 6);
        console.log("| balanceof(7):  " + balanceAsset.valueOf().toString());

        var numAssetsGiven = lootboxOpenedEvent[0].args.numAssetsGiven.toString();
        expect(numAssetsGiven, "numAssetsGiven is empty").to.not.equal(0x0);
        console.log("| Number of Rewards Given: " + numAssetsGiven);
    });

    it('Do not let broke user mint lootbox', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        await expect(lootbox.connect(player2Address).mint(tokenId, 1), "Player 2 lootbox mint should fail").to.be.reverted;
    });

    it('Operations stop working when entire lootbox system paused and operations resume when unpaused', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Pause the lootbox contract.
        await lootbox.connect(managerAddress).managerSetPause(true);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        await expect(lootbox.connect(playerAddress).mint(tokenId, 1), "Player 1 lootbox mint should fail").to.be.reverted;

        // Unpause the lootbox contract so we can mint one, to pause again and test failing on burning.
        await lootbox.connect(managerAddress).managerSetPause(false);

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        // Pause the lootbox contract.
        await lootbox.connect(managerAddress).managerSetPause(true);

        await expect(lootbox.connect(playerAddress).burn(tokenId), "Player 1 lootbox burn should fail").to.be.reverted;
    });

    it('Operations stop working when single lootbox blueprint disabled and operations resume when re-enabled', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        // Pause the specific lootbox contract.
        await lootboxStorage.connect(managerAddress).setBlueprintEnabled(tokenId, false);

        await expect(lootbox.connect(playerAddress).mint(tokenId, 1), "Player 1 lootbox mint should fail").to.be.reverted;

        // Unpause the lootbox contract so we can mint one, to pause again and test failing on burning.
        await lootboxStorage.connect(managerAddress).setBlueprintEnabled(tokenId, true);

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        // Pause the lootbox contract.
        await lootboxStorage.connect(managerAddress).setBlueprintEnabled(tokenId, false);

        await expect(lootbox.connect(playerAddress).burn(tokenId), "Player 1 lootbox burn should fail").to.be.reverted;
    });

    it('Test setting blueprint cost', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        expect(lootboxCost, "Cost is empty").to.not.equal(0x0);
        expect(lootboxCost, "Incorrect cost").to.equal(web3.utils.toWei('25', 'ether'));

        // Change the cost of the blueprint.
        await lootboxStorage.connect(managerAddress).setBlueprintCost(tokenId, web3.utils.toWei('33', 'ether'));

        lootboxCost = await lootboxStorage.getCost(tokenId);
        lootboxCost = lootboxCost.toString();
        expect(lootboxCost, "Incorrect changed cost").to.equal(web3.utils.toWei('33', 'ether'));

        var results = await lootbox.connect(playerAddress).mint(tokenId, 1);
        await expect(results).to.emit(lootbox, 'LootboxCreated');

        expect(await lootboxCreditToken.balanceOf(playerAddress.address), "Player's Lootbox Credit Incorrect").to.be.equal(web3.utils.toWei('9967', 'ether'));
    });

    it('Test setting max rewards', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var lootboxNumRewards = await lootboxStorage.getMaxRewardAssetsGiven(tokenId);
        expect(lootboxNumRewards, "Max Rewards is empty").to.not.equal(0x0);
        expect(lootboxNumRewards, "Incorrect max rewards").to.equal(2);

        // Change the max rewards of the blueprint.
        await lootboxStorage.connect(managerAddress).setMaxRewardAssetsGiven(tokenId, 3);

        var lootboxNumRewards = await lootboxStorage.getMaxRewardAssetsGiven(tokenId);
        expect(lootboxNumRewards, "Incorrect changed max rewards").to.equal(3);
    });

    it('Test clearing rewards', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var lootboxNumRewards = await lootboxStorage.getNumAddedRewards(tokenId);
        expect(lootboxNumRewards, "Num Rewards is empty").to.not.equal(0x0);
        expect(lootboxNumRewards, "Incorrect max rewards").to.equal(2);

        await lootboxStorage.connect(managerAddress).clearLootboxRewards(tokenId);

        lootboxNumRewards = await lootboxStorage.getNumAddedRewards(tokenId);
        expect(lootboxNumRewards, "Incorrect changed num rewards").to.equal(0);
    });

    it('Fail adding rewards as non-manager', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards as a player and fail
        await expect(lootboxStorage.connect(playerAddress).addLootboxReward(tokenId, rewards[2][0]), "Player 1 add lootbox reward should fail").to.be.reverted;
    });

    it('Fail clearing rewards as non-manager', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // Add some rewards.
        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][0]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        var results = await lootboxStorage.connect(managerAddress).addLootboxReward(tokenId, rewards[2][1]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintRewardAdded');

        await expect(lootboxStorage.connect(playerAddress).clearLootboxRewards(tokenId), "Player 1 clear lootbox rewards should fail").to.be.reverted;
    });

    it('Fail disabling blueprint as non-manager', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        // As a player, try to disable a blueprint.
        await expect(lootboxStorage.connect(playerAddress).setBlueprintEnabled(tokenId, false), "Player 1 disable blueprint should fail").to.be.reverted;
    });

    it('Fail adding blueprint as non-manager', async () => {
        await expect(lootboxStorage.connect(playerAddress).setBlueprint(blueprints[2]), "Player 1 set blueprint should fail").to.be.reverted;
    });

    it('Fail changing blueprint as non-manager', async () => {
        var results = await lootboxStorage.connect(managerAddress).setBlueprint(blueprints[2]);
        await expect(results).to.emit(lootboxStorage, 'BlueprintUpdated');

        var receipt = await results.wait();
        var updatedBlueprint = receipt.events?.filter((x) => {return x.event == "BlueprintUpdated"});

        var tokenId = updatedBlueprint[0].args.tokenId;
        expect(tokenId, "Id is empty").to.not.equal(0x0);

        await expect(lootboxStorage.connect(playerAddress).setBlueprintCost(tokenId, web3.utils.toWei('25', 'ether')), "Player 1 set blueprint cost should fail").to.be.reverted;

        await expect(lootboxStorage.connect(playerAddress).setMaxRewardAssetsGiven(tokenId, 10), "Player 1 set max reward assets should fail").to.be.reverted;
    });

    // TODO: Test against invalid data inputs.
    // TODO: Change test case to have an amount set to > 1
    // TODO: Test reentrancy of mint/burn functions?

});
