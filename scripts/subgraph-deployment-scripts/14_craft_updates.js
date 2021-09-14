// Upgrade Deployer proxy
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades');
const { constants } = require('@openzeppelin/test-helpers');

// RAWR Token
const Content = artifacts.require("Content");
const Salvage = artifacts.require("Salvage");
const Craft = artifacts.require("Craft");

module.exports = async function(deployer, networks, accounts) {
    [
        deployerAddress,            // Address that deployed contracts
        deployerWalletAddress,      // Developer wallet address
        deployerAltAddress,      // Developer wallet address
        player1Address,
        player2Address,
    ] = accounts;

    const content = await Content.deployed();
    const craft = await Craft.deployed();
    const salvage = await Salvage.deployed();

    var newRecipe = [
        [
            1, // id
            web3.utils.toWei('1', 'ether'), // crafting rate
            false, // enabled
            [   // array of material asset data
                [content.address, 4],
                [content.address, 2]
            ],
            [1, 1], // array of material amounts
            [   // array of reward asset data
                [content.address, 6]
            ],
            [1] // array of reward amounts
        ],
        [
            2, // id
            web3.utils.toWei('0.5', 'ether'), // crafting rate
            true, // enabled
            [   // array of material asset data
                [content.address, 3],
                [content.address, 1]
            ],
            [2, 3], // array of material amounts
            [   // array of reward asset data
                [content.address, 7]
            ],
            [2] // array of reward amounts
        ]
    ];

    await craft.setRecipeBatch(newRecipe, {from: deployerAddress});

    var salvageableAssets = [
        [
            [content.address, 3],
            0,
            [ // array
                [   // salvageableasset
                    [content.address, 1],
                    web3.utils.toWei('1', 'ether'),
                    2
                ],
                [
                    [content.address, 2],
                    web3.utils.toWei('1', 'ether'),
                    1
                ]
            ]
        ],
        [
            [content.address, 4],
            0,
            [ // array
                [   // salvageableasset
                    [content.address, 1],
                    web3.utils.toWei('1', 'ether'),
                    2
                ],
                [
                    [content.address, 2],
                    web3.utils.toWei('1', 'ether'),
                    3
                ]
            ]
        ]
    ];

    await salvage.setSalvageableAssetBatch(salvageableAssets, {from: deployerAddress});

    // unpause 
    await craft.managerSetPause(false, {from: deployerAddress});
    await salvage.managerSetPause(false, {from: deployerAddress});

    // mint some assets
    var mintData = [player1Address, [4, 3], [2, 2], 0, constants.ZERO_ADDRESS, []];
    await content.mintBatch(mintData, {from: deployerAddress});
};