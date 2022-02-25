const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { sign } = require("../mint");

describe('Salvage Contract', () => {
    var deployerAddress, managerAddress, creatorAddress, playerAddress, player2Address;
    var contentFactory;
    var contentManager;
    var AccessControlManager, ContentManager, ContentStorage, Content, L2NativeRawrshakERC20Token;

    var l2Bridge = "0x50EB44e3a68f1963278b4c74c6c343508d31704C";

    // NFT
    var content;

    // Rawr Token 
    var rawrToken;

    // Lootbox Credit Token 
    var lootboxCreditToken;

    var salvage;

    const _1e18 = ethers.BigNumber.from('10').pow(ethers.BigNumber.from('18'));

    var initialSalvageableAssetData;

    before(async () => {
        [deployerAddress, managerAddress, creatorAddress, playerAddress, player2Address] = await ethers.getSigners();
        AccessControlManager = await ethers.getContractFactory("AccessControlManager");
        TestSalvage = await ethers.getContractFactory("TestSalvage");
        ContentFactory = await ethers.getContractFactory("ContentFactory");
        ContentManager = await ethers.getContractFactory("ContentManager");
        ContentStorage = await ethers.getContractFactory("ContentStorage");
        Content = await ethers.getContractFactory("Content");
        L2NativeRawrshakERC20Token = await ethers.getContractFactory("L2NativeRawrshakERC20Token");

        originalAccessControlManager = await AccessControlManager.deploy();
        originalContent = await Content.deploy();
        originalContentStorage = await ContentStorage.deploy();
        originalContentManager = await ContentManager.deploy();

        // Initialize Clone Factory
        contentFactory = await upgrades.deployProxy(ContentFactory, [originalContent.address, originalContentManager.address, originalContentStorage.address, originalAccessControlManager.address]);
    });

    beforeEach(async () => {
        salvage = await upgrades.deployProxy(TestSalvage, [1000]);

        rawrToken = await L2NativeRawrshakERC20Token.deploy(l2Bridge, "RawrToken", "RAWR", ethers.BigNumber.from(100000000).mul(_1e18));
        await rawrToken.grantRole(await rawrToken.MINTER_ROLE(), deployerAddress.address);
        await rawrToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));

        lootboxCreditToken = await L2NativeRawrshakERC20Token.deploy(l2Bridge, "Rawrshak Lootbox Credit", "RAWRLOOT", ethers.BigNumber.from(100000000).mul(_1e18));
        await lootboxCreditToken.grantRole(await lootboxCreditToken.MINTER_ROLE(), deployerAddress.address);
        await lootboxCreditToken.mint(deployerAddress.address, ethers.BigNumber.from(100000000).mul(_1e18));
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

        // Give player 1 20000 RAWR tokens and player 2 10000 tokens
        await rawrToken.transfer(playerAddress.address, ethers.BigNumber.from(20000).mul(_1e18));
        await rawrToken.transfer(player2Address.address, ethers.BigNumber.from(10000).mul(_1e18));

        // Give player 1 10000 Credit tokens
        await lootboxCreditToken.transfer(playerAddress.address, ethers.BigNumber.from(10000).mul(_1e18));

        expect(await lootboxCreditToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(10000).mul(_1e18), "Lootbox Credit Token Amount Invalid");

        // Give deployer mint role.
        var approvalPair = [[deployerAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Mint assets
        // Type of LibAsset.MintData
        var mintData = [playerAddress.address, [0, 1], [10, 10], 0, ethers.constants.AddressZero, []];
        await content.mintBatch(mintData);

        // Allow the salvage contract to be able to mint on the lootbox credit token contract.
        await lootboxCreditToken.grantRole(await lootboxCreditToken.MINTER_ROLE(), salvage.address);
        
        // Register the salvage as a system on the content contract
        var approvalPair = [[salvage.address, true], [creatorAddress.address, true]];
        await contentManager.registerOperators(approvalPair);

        // Register manager
        await salvage.registerManager(managerAddress.address);

        var salvageApprovalPair = [
            [salvage.address, true]
        ];

        await contentManager.registerSystemContracts(salvageApprovalPair);

        // approve player
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);
        
        // Type of LibCraft.SalvageableAsset
        initialSalvageableAssetData = [
            [
                [content.address, 0],
                0, // salvage type
                [ // array
                    [   // SalvageOutput
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 3],
                        1000000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
    }

    it('Check if Salvage Contract was deployed properly', async () => {
        expect(salvage.address != 0x0, "Salvage Contract was not deployed properly.").to.equal(true);
    });

    it('Add Salvageable Assets', async () => {
        await createContentContract();

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData);
        await expect(results)
                .to.emit(salvage, 'SalvageableAssetsUpdated');

        var receipt = await results.wait();
        //console.log(receipt)
        let assetId = receipt.events[0].args.ids[0];
        //console.log(assetId);
        expect(receipt.events[0].args[1].toString() != 0x0, "Id is empty.").to.equal(true);

        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId);
        var outputsData = await salvage.getSalvageOutputs([content.address, 0]);

        //console.log(storedSalvageableAssetData);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 0, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 0, "Salvage Type incorrect").to.equal(true);
        expect(outputsData.outputAssets.length == 2, "Rewards length incorrect").to.equal(true);
        for (var i = 0; i < outputsData.outputAssets.length; ++i) {
            expect(outputsData.outputAssets[i].asset.content == content.address, "Invalid Reward Address").to.equal(true);
            expect(outputsData.outputAssets[i].probability == 1000000, "Invalid Reward probability").to.equal(true);
            expect(outputsData.outputLootboxCredits.tokenAddress == lootboxCreditToken.address, "Invalid Lootbox Credit token address").to.equal(true);
            expect(outputsData.outputLootboxCredits.probability == 1000000, "Invalid Lootbox Credit token probability").to.equal(true);
            expect(outputsData.outputLootboxCredits.amount == 1, "Invalid Lootbox Credit token reward amount").to.equal(true);
        }
    });

    it('Add Salvageable Asset with Lootbox Credit Only', async () => {
        await createContentContract();
        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [
                    // Empty Array 
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        await expect(results)
                .to.emit(salvage, 'SalvageableAssetsUpdated');

        var receipt = await results.wait();
        //console.log(receipt)
        let assetId = receipt.events[0].args.ids[0];
        //console.log(assetId);
        expect(receipt.events[0].args[1].toString() != 0x0, "Id is empty.").to.equal(true);

        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId);
        var outputsData = await salvage.getSalvageOutputs([content.address, 0]);

        //console.log(storedSalvageableAssetData);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 0, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 0, "Salvage Type incorrect").to.equal(true);
        expect(outputsData.outputAssets.length == 0, "Rewards length incorrect").to.equal(true);
        expect(outputsData.outputLootboxCredits.tokenAddress == lootboxCreditToken.address, "Invalid Lootbox Credit token address").to.equal(true);
        expect(outputsData.outputLootboxCredits.probability == 1000000, "Invalid Lootbox Credit token probability").to.equal(true);
        expect(outputsData.outputLootboxCredits.amount == 1, "Invalid Lootbox Credit token reward amount").to.equal(true);
    });
    
    it('Add Multiple Salvageable Assets', async () => {
        await createContentContract();

        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 3],
                        1000000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ],
            [
                [content.address, 1],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        500000,
                        2
                    ],
                    [
                        [content.address, 4],
                        500000,
                        3
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        await expect(results)
                .to.emit(salvage, 'SalvageableAssetsUpdated');
        
        var receipt = await results.wait();
        var assetId1 = receipt.events[0].args.ids[0];
        var assetId2 = receipt.events[0].args.ids[1];
        
        // Test Asset 1
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId1);
        var outputsData = await salvage.getSalvageOutputs([content.address, 0]);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 0, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 0, "Salvage Type incorrect").to.equal(true);
        expect(outputsData.outputAssets.length == 2, "Rewards length incorrect").to.equal(true);
        for (var i = 0; i < outputsData.outputAssets.length; ++i) {
            expect(outputsData.outputAssets[i].asset.content == content.address, "Invalid Reward Address").to.equal(true);
            expect(outputsData.outputAssets[i].probability == 1000000, "Invalid Reward probability").to.equal(true);
        }
        expect(outputsData.outputLootboxCredits.tokenAddress == lootboxCreditToken.address, "Invalid Lootbox Credit token address").to.equal(true);
        expect(outputsData.outputLootboxCredits.probability == 1000000, "Invalid Lootbox Credit token probability").to.equal(true);
        expect(outputsData.outputLootboxCredits.amount == 1, "Invalid Lootbox Credit token reward amount").to.equal(true);
        
        // Test Asset 2
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId2);
        var outputsData = await salvage.getSalvageOutputs([content.address, 1]);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 1, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 1, "Salvage Type incorrect").to.equal(true);
        expect(outputsData.outputAssets.length == 2, "Rewards length incorrect").to.equal(true);
        for (var i = 0; i < outputsData.outputAssets.length; ++i) {
            expect(outputsData.outputAssets[i].asset.content == content.address, "Invalid Reward Address").to.equal(true);
            expect(outputsData.outputAssets[i].probability == 500000, "Invalid Reward probability").to.equal(true);
        }
        expect(outputsData.outputLootboxCredits.tokenAddress == lootboxCreditToken.address, "Invalid Lootbox Credit token address").to.equal(true);
        expect(outputsData.outputLootboxCredits.probability == 1000000, "Invalid Lootbox Credit token probability").to.equal(true);
        expect(outputsData.outputLootboxCredits.amount == 1, "Invalid Lootbox Credit token reward amount").to.equal(true);
    });

    it('Update Salvageable Assets', async () => {
        await createContentContract();

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        var updatedData = [
            [
                [content.address, 0],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        100000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        results = await salvage.connect(managerAddress).addSalvageableAssetBatch(updatedData);
        
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId);
        var outputsData = await salvage.getSalvageOutputs([content.address, 0]);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 0, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 1, "Salvage Type not updated").to.equal(true);
        expect(outputsData.outputAssets.length == 1, "Rewards length not updated").to.equal(true);
        expect(outputsData.outputAssets[0].asset.content == content.address, "Invalid Reward Address").to.equal(true);
        expect(outputsData.outputAssets[0].asset.tokenId == 4, "Invalid Reward updated").to.equal(true);
        expect(outputsData.outputAssets[0].probability == 100000, "Invalid Reward probability").to.equal(true);
        expect(outputsData.outputAssets[0].amount == 1, "Invalid Reward probability updated").to.equal(true);
        expect(outputsData.outputLootboxCredits.tokenAddress == lootboxCreditToken.address, "Invalid Lootbox Credit token address").to.equal(true);
        expect(outputsData.outputLootboxCredits.probability == 1000000, "Invalid Lootbox Credit token probability").to.equal(true);
        expect(outputsData.outputLootboxCredits.amount == 1, "Invalid Lootbox Credit token reward amount").to.equal(true);
    });

    it('Update Salvageable Assets - output assets only to lootbox credits only', async () => {
        await createContentContract();

        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [
                    // Empty Array 
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        var updatedData = [
            [
                [content.address, 0],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        100000,
                        1
                    ]
                ],
                [
                    ethers.constants.AddressZero,
                    0,
                    0
                ]
            ]
        ];

        results = await salvage.connect(managerAddress).addSalvageableAssetBatch(updatedData);
        
        var storedSalvageableAssetData = await salvage.getSalvageableAssets(assetId);
        var outputsData = await salvage.getSalvageOutputs([content.address, 0]);

        expect(storedSalvageableAssetData.asset.content == content.address, "Asset content address incorrect").to.equal(true);
        expect(storedSalvageableAssetData.asset.tokenId == 0, "Asset id incorrect").to.equal(true);
        expect(storedSalvageableAssetData.salvageType.toNumber() == 0, "Salvage Type not updated").to.equal(true);
        expect(outputsData.outputAssets.length == 1, "Rewards length not updated").to.equal(true);
        expect(outputsData.outputAssets[0].asset.content == content.address, "Invalid Reward Address").to.equal(true);
        expect(outputsData.outputAssets[0].asset.tokenId == 4, "Invalid Reward updated").to.equal(true);
        expect(outputsData.outputAssets[0].probability == 100000, "Invalid Reward probability").to.equal(true);
        expect(outputsData.outputAssets[0].amount == 1, "Invalid Reward probability updated").to.equal(true);
        expect(outputsData.outputLootboxCredits.tokenAddress == ethers.constants.AddressZero, "Invalid Lootbox Credit token address").to.equal(true);
        expect(outputsData.outputLootboxCredits.probability == 0, "Invalid Lootbox Credit token probability").to.equal(true);
        expect(outputsData.outputLootboxCredits.amount == 0, "Invalid Lootbox Credit token reward amount").to.equal(true);
    });


    it('Failing to Add Salvageable Assets', async () => {
        await createContentContract();

        // test invalid permission
        await expect(salvage.connect(deployerAddress).addSalvageableAssetBatch(initialSalvageableAssetData), "Test Invalid Permission").to.be.reverted;

        // test empty input
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch([]), "Test Empty Input").to.be.reverted;
        
        var invalidData = [
            [
                [content.address, 0],
                3,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        100000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(invalidData), "Test Invalid Data").to.be.reverted;
        
        // invalid salvage type
        invalidData = [
            [
                [content.address, 0],
                3,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        100000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(invalidData), "Test Invalid Data").to.be.reverted;

        // invalid probability
        invalidData = [
            [
                [content.address, 0],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        1000001,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(invalidData), "Test Invalid Probability").to.be.reverted;

        invalidData = [
            [
                [content.address, 0],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        0,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(invalidData), "Test Invalid Data").to.be.reverted;

        // invalid reward amount
        invalidData = [
            [
                [content.address, 0],
                1,
                [ // array
                    [   // salvageableasset
                        [content.address, 4],
                        1000000,
                        0
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(invalidData), "Test Invalid Reward Amount").to.be.reverted;
        
        // test not paused
        await salvage.connect(managerAddress).managerSetPause(false);
        await expect(salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData), "Test Invalid Not Paused").to.be.reverted;
    });

    it('Salvage Asset', async () => {
        await createContentContract();

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);
        
        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);

        var results = await salvage.connect(playerAddress).salvage([content.address, 0], 1);
        await expect(results)
                .to.emit(salvage, 'AssetSalvaged');

        expect(await content.balanceOf(playerAddress.address, 0) == 9, "Asset was not burned.");
        expect(await content.totalSupply(0) == 9, "Asset supply is incorrect.");

        expect(await content.balanceOf(playerAddress.address, 2) == 2, "Materials Asset 2 was not minted to player").to.equal(true);
        expect(await content.totalSupply(2) == 2, "Materials Asset 3 supply is incorrect").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 3) == 1, "Materials Asset 3 was not minted to player").to.equal(true);
        expect(await content.totalSupply(3) == 1, "Materials Asset 3 supply is incorrect").to.equal(true);
    });

    it('Salvage multiple instances of the same asset', async () => {
        await createContentContract();

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);
        
        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);

        var results = await salvage.connect(playerAddress).salvage([content.address, 0], 5);
        await expect(results)
                .to.emit(salvage, 'AssetSalvaged');

        expect(await content.balanceOf(playerAddress.address, 0) == 5, "Asset was not burned.");
        expect(await content.totalSupply(0) == 5, "Asset supply is incorrect.");

        expect(await content.balanceOf(playerAddress.address, 2) == 10, "Materials Asset 2 was not minted to player").to.equal(true);
        expect(await content.totalSupply(2) == 10, "Materials Asset 3 supply is incorrect").to.equal(true);
        expect(await content.balanceOf(playerAddress.address, 3) == 5, "Materials Asset 3 was not minted to player").to.equal(true);
        expect(await content.totalSupply(3) == 5, "Materials Asset 3 supply is incorrect").to.equal(true);
    });

    it('Salvage Multiple Asset', async () => {
        await createContentContract();

        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 3],
                        1000000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ],
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
                        3
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);
        
        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);

        var assetsToSalvage = [
            [content.address, 0],
            [content.address, 1]
        ];
        var amounts = [1, 1];
        var results = await salvage.connect(playerAddress).salvageBatch(assetsToSalvage, amounts);
        await expect(results)
                .to.emit(salvage, 'AssetSalvagedBatch');

        expect(await content.balanceOf(playerAddress.address, 0) == 9, "Asset 0 was not burned.");
        expect(await content.totalSupply(0) == 9, "Asset 0 supply is incorrect.");
        expect(await content.balanceOf(playerAddress.address, 1) == 9, "Asset 1 was not burned.");
        expect(await content.totalSupply(1) == 9, "Asset 1 supply is incorrect.");
        expect(await content.balanceOf(playerAddress.address, 2) == 4, "Asset 2 was not burned");
        expect(await content.totalSupply(2) == 4, "Asset 2 supply is incorrect");
        expect(await content.balanceOf(playerAddress.address, 3) == 1, "Asset 3 was not burned");
        expect(await content.totalSupply(3) == 1, "Asset 3 supply is incorrect");
        expect(await content.balanceOf(playerAddress.address, 4) == 3, "Asset 4 was not burned");
        expect(await content.totalSupply(4) == 3, "Asset 4 supply is incorrect");
    });

    it('Salvage multiple instances of multiple asset', async () => {
        await createContentContract();

        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 3],
                        1000000,
                        1
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ],
            [
                [content.address, 1],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ],
                    [
                        [content.address, 4],
                        1000000,
                        3
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];
        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);

        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);

        var assetsToSalvage = [
            [content.address, 0],
            [content.address, 1]
        ];
        var amounts = [5, 7];
        var results = await salvage.connect(playerAddress).salvageBatch(assetsToSalvage, amounts);
        await expect(results).to.emit(salvage, 'AssetSalvagedBatch');

        expect(await content.balanceOf(playerAddress.address, 0) == 5, "Asset 0 was not burned.");
        expect(await content.totalSupply(0) == 5, "Asset 0 supply is incorrect.");
        expect(await content.balanceOf(playerAddress.address, 1) == 3, "Asset 1 was not burned.");
        expect(await content.totalSupply(1) == 4, "Asset 1 supply is incorrect.");
        expect(await content.balanceOf(playerAddress.address, 2) == 24, "Asset 2 was not burned");
        expect(await content.totalSupply(2) == 24, "Asset 2 supply is incorrect");
        expect(await content.balanceOf(playerAddress.address, 3) == 5, "Asset 3 was not burned");
        expect(await content.totalSupply(3) == 5, "Asset 3 supply is incorrect");
        expect(await content.balanceOf(playerAddress.address, 4) == 21, "Asset 4 was not burned");
        expect(await content.totalSupply(4) == 21, "Asset 4 supply is incorrect");
    });

    it('Invalid Salvage Asset', async () => {
        await createContentContract();

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(initialSalvageableAssetData);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];
        
        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);

        // no content contract approval for the salvage contract
        await content.connect(playerAddress).setApprovalForAll(salvage.address, false);

        var assetData = [content.address, 0];
        await expect(salvage.connect(playerAddress).salvage(assetData, 1), "no content contract approval for the salvage contract").to.be.reverted;
        
        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);
        
        // Invalid amount
        var assetData = [content.address, 0];
        await expect(salvage.connect(playerAddress).salvage(assetData, 0), "Invalid amount").to.be.reverted;

        // invalid user balance
        await expect(salvage.connect(playerAddress).salvage(assetData, 15), "Invalid user balance").to.be.reverted;
        
        // item not salvageable
        var assetData = [content.address, 2];
        await expect(salvage.connect(playerAddress).salvage(assetData, 0), "Item not salvageable").to.be.reverted;
    });

    // // it('Salvage Asset with Random Salvage Type', async () => {
    // // });

    it('Salvage asset w/ Lootbox Credit reward', async () => {
        await createContentContract();

        var salvageableAssets = [
            [
                [content.address, 0],
                0,
                [ // array
                    [   // salvageableasset
                        [content.address, 2],
                        1000000,
                        2
                    ]
                ],
                [   // LibLootbox.LootboxCreditReward
                    lootboxCreditToken.address,
                    1000000,
                    1
                ]
            ]
        ];

        var results = await salvage.connect(managerAddress).addSalvageableAssetBatch(salvageableAssets);
        var receipt = await results.wait();
        var assetId = receipt.events[0].args.ids[0];

        // unpause the salvage contract so we can start salvaging assets
        await salvage.connect(managerAddress).managerSetPause(false);

        // Approve salvage contract as an operator
        await content.connect(playerAddress).setApprovalForAll(salvage.address, true);

        var assetsToSalvage = [
            [content.address, 0]
        ];
        var amounts = [1];
        var results = await salvage.connect(playerAddress).salvageBatch(assetsToSalvage, amounts);
        await expect(results)
                .to.emit(salvage, 'AssetSalvagedBatch');
                
        await expect(results)
                .to.emit(salvage, 'LootboxCreditEarned');

        expect(await lootboxCreditToken.balanceOf(playerAddress.address)).to.equal(ethers.BigNumber.from(1000).mul(_1e18) + 1, "Player was not minted Lootbox Credit");
    });

});
