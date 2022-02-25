// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "./LibCraft.sol";

library LibLootbox {
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    struct LootboxCreditReward {
        address tokenAddress;       // LootboxCredit contract token address.
        uint24  probability;        // 1,000,000 is 100%
        uint256 amount;             // amount of asset minted when dice roll probability is met
    }

    struct LootboxReward {
        LibCraft.AssetData asset;   // asset to be minted when a Lootbox is burned
        uint24  probability;        // 1,000,000 is 100%
        uint256 amount;             // amount of asset minted when dice roll probability is met
        uint8   class;              // number signifying the rarity/class that an asset belongs to. the lower the number the more common the asset is. 
                                    // 0 means no class set (i.e. unused). 1 is most common, 2 is uncommon, 3 is rare, etc. What each of these classes
                                    // are called is entirely up to the developer.
    }

    struct Blueprint {
        bool enabled;               // whether or not this lootbox can be minted yet
        uint256 cost;               // lootbox credit cost to buy the lootbox
        uint16 maxAssetsGiven;      // Max number of reward items the lootbox will randomly pick from the assets list when burned.
        bool hasGuaranteedItems;    // Whether or not we have any items that are guaranteed to be given.
    }

    function verifyLootboxCreditReward(LootboxCreditReward memory _reward) internal pure {
        // Check validity of the lootbox credit asset.
        require(_reward.tokenAddress != address(0), "Invalid Credit Token Address");
        require(_reward.probability > 0 && _reward.probability <= 1e6, "Invalid credit probability.");
        require(_reward.amount > 0, "Invalid credit amount.");
    }

    function verifyLootboxReward(LootboxReward memory _reward) internal pure {
        // Check validity of the lootbox reward asset.
        require(_reward.asset.content != address(0), "Invalid content address");
        require(_reward.probability > 0 && _reward.probability <= 1e6, "Invalid credit probability.");
        require(_reward.amount > 0, "Invalid credit amount.");
        // Class is optional, so no need to check that here.
    }

    function isLootboxRewardValid(LootboxReward memory _reward) internal pure returns(bool) {
        if(_reward.asset.content != address(0) &&
           _reward.probability > 0 && _reward.probability <= 1e6 &&
           _reward.amount > 0)
        {
            return true;
        }
        return false;
    }

    function verifyBlueprint(LibLootbox.Blueprint memory _blueprint) internal pure {
        require(_blueprint.maxAssetsGiven > 0, "Invalid max assets given.");
        require(_blueprint.cost > 0, "Invalid cost");
    }

    function checkForGuaranteedItems(LibLootbox.LootboxReward[] memory _rewards) internal pure returns(bool) {
        for (uint256 i = 0; i < _rewards.length; ++i) {
            if(_rewards[i].probability >= 1e6)
            {
                return true;
            }
        }
        return false;
    }

    function salvageCredit(LootboxCreditReward storage _reward, address _sender, uint256 _seed) internal view returns(uint256 amount) {
        verifyLootboxCreditReward(_reward);
        amount = 0;
        if(_reward.probability == 1e6) {
            amount = _reward.amount;
        }
        else
        {
            uint256 randomVal = random(_sender, _seed);
            if (randomVal.mod(1e6) <= _reward.probability) {
                amount = _reward.amount;
            }
        }
    }

    function random(address _sender, uint256 _seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), _sender, _seed)));
    }

    // TODO: Make this class upgradeable somehow. Will want to upgrade randomization logic post deployment.
}