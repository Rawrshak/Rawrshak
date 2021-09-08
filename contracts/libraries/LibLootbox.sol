// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "../utils/LibConstants.sol";
import "./LibCraft.sol";

library LibLootbox {
    using SafeMathUpgradeable for uint256;
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    struct LootboxCreditReward {
        address tokenAddress;       // LootboxCredit contract token address.
        uint256 probability;        // stored in ETH (1 ETH is 100%, 0.5 ETH is 50%, etc)
        uint256 amount;             // amount of asset minted when dice roll probability is met
    }

    struct LootboxReward {
        LibCraft.AssetData asset;   // asset to be minted when a Lootbox is burned
        uint256 probability;        // stored in ETH (1 ETH is 100%, 0.5 ETH is 50%, etc)
        uint256 amount;             // amount of asset minted when dice roll probability is met
        uint8   class;              // number signifying the rarity/class that an asset belongs to. the lower the number the more common the asset is. 
                                    // 0 means no class set (i.e. unused). 1 is most common, 2 is uncommon, 3 is rare, etc. What each of these classes
                                    // are called is entirely up to the developer.
    }

    struct Blueprint {
        uint256 id;
        bool enabled;               // whether or not this lootbox can be minted yet
        uint256 cost;               // lootbox credit cost to buy the lootbox
        LootboxReward[] rewards;
    }

    function verifyLootboxCreditReward(LootboxCreditReward memory _reward) internal pure {
        // Check validity of the lootbox credit asset.
        require(_reward.tokenAddress != address(0), "Invalid Credit Token Address");
        require(_reward.probability > 0 && _reward.probability <= 1 ether, "Invalid credit probability.");
        require(_reward.amount > 0, "Invalid credit amount.");
    }

    function salvageCredit(LootboxCreditReward storage _reward, uint256 _seed) internal view returns(uint256 amount) {
        amount = 0;
        if(_reward.probability == 1 ether) {
            amount = _reward.amount;
        }
        else
        {
            uint256 randomVal = random(msg.sender, _seed);
            if (randomVal.mod(1 ether) <= _reward.probability) {
                amount = _reward.amount;
            }
        }
    }

    function random(address _sender, uint256 _seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), _sender, _seed)));
    }

    // TODO: Write randomBatch()
    // So if there are 6 items that need randomization we return an array of 6 randomly seeded (non-unique) values.

    // TODO: Make this class upgradeable somehow. Will want to upgrade randomization logic post deployment.
}