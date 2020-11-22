// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./Game.sol";
import "../utils/Utils.sol";

// Todo: the key is actually Rarity, but enum as a map key has not been implemented yet
// Todo: Figure out what exactly to do for increasing the probabilities/multiplier per item. For now, just keep the 
//       probabilities flat.
// Todo: Developer can add multiple kinds of lootboxes per contract

contract LootboxContract is AccessControl, ERC1155 {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using SafeMath for *;
    using Utils for *;

    /******** Constants ********/
    uint256 public LOOTBOX = 0;

    /******** Enums ********/
    enum Rarity {
        Mythic,
        Exotic,
        SuperRare,
        Rare,
        Scarce,
        Uncommon,
        Common
    }

    /******** Data Structures ********/
    struct ItemGameInfo {
        address gameContractAddress;
        uint256 gameContractItemId;
        EnumerableSet.UintSet rarity;
    }

    struct Input {
        uint256 requiredAmount;
        uint256 multiplier;
    }

    struct Reward {
        uint256 lootboxId;
        uint256 amount;
    }
    
    struct RewardSet {
        EnumerableSet.UintSet ids;
        mapping(uint256 => Reward) map;
    }

    /******** Stored Variables ********/
    EnumerableSet.UintSet private itemIds;
    mapping(uint256 => ItemGameInfo) private items;
    mapping(uint256 => Input) private inputsList;
    // uint8(Rarity.Common)
    mapping(uint8 => RewardSet) private rewardsList;
    uint256 private requiredInputItemsCount = 4;
    
    // uint8(Rarity.Common)
    uint32[7] probabilities;
    
    /******** Events ********/
    event AddedInputItem(uint256, bool);
    event AddedInputItemBatch(uint256[], bool[]);
    event AddedReward(uint256, bool);
    event AddedRewardBatch(uint256[], bool[]);
    event LootboxGenerated(uint256);
    event LootboxOpened(uint256);

    /******** Roles ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(hasRole(role, msg.sender), "Caller missing permissions");
        _;
    }

    modifier checkAddressIsContract(address contractAddress) {
        require(Address.isContract(contractAddress), "Address not valid");
        _;
    }

    /******** Public API ********/
    constructor(string memory url) public ERC1155(url) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        
        probabilities[uint8(Rarity.Mythic)] = 1;
        probabilities[uint8(Rarity.Exotic)] = 25;
        probabilities[uint8(Rarity.SuperRare)] = 200;
        probabilities[uint8(Rarity.Rare)] = 1000;
        probabilities[uint8(Rarity.Scarce)] = 5000;
        probabilities[uint8(Rarity.Uncommon)] = 25000;
        probabilities[uint8(Rarity.Common)] = 100000;
    }

    function registerInputItem(address contractAddress, uint256 id, uint256 amount, uint256 multiplier)
        public
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(contractAddress)
    {
        // Todo: check that GameContractAddress is a GameContract interface
        // Check for burner role
        Game game = Game(contractAddress);
        require(
            game.hasRole(game.BURNER_ROLE(), address(this)),
            "Contract missing permissions."
        );
        require(game.exists(id), "Item does not exist.");

        // Add to items map
        (uint256 hashId, bool result) = _addLootboxItem(contractAddress, id);

        Input storage inputItem = inputsList[hashId];
        inputItem.requiredAmount = amount;
        inputItem.multiplier = multiplier;

        emit AddedInputItem(hashId, result);
    }

    function registerInputItemBatch(
        address contractAddress,
        uint256[] memory ids,
        uint256[] memory amounts,
        uint256[] memory multipliers
    ) 
        public
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(contractAddress)
    {
        require(ids.length == amounts.length && ids.length == multipliers.length, "Input array length mismatch");
        
        // Todo: check that GameContractAddress is a GameContract interface
        // Check GameContract for burner role
        Game game = Game(contractAddress);
        require(
            game.hasRole(game.BURNER_ROLE(), address(this)),
            "Contract missing permissions."
        );

        // Add to items map
        uint256[] memory hashIds;
        bool[] memory results;
        for (uint256 i = 0; i < ids.length; ++i) {
            require(game.exists(ids[i]), "Item does not exist.");

            (uint256 hashId, bool result) = _addLootboxItem(contractAddress, ids[i]);

            Input storage inputItem = inputsList[hashId];
            inputItem.requiredAmount = amounts[i];
            inputItem.multiplier = multipliers[i];

            hashIds[i] = hashId;
            results[i] = result;
        }

        emit AddedInputItemBatch(hashIds, results);
    }

    function registerReward(address contractAddress, uint256 id, Rarity rarity, uint256 amount)
        public
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(contractAddress)
    {
        // Todo: check that GameContractAddress is a Gamece
        // Check Gamener role
        Game game = Game(contractAddress);
        require(
            game.hasRole(game.BURNER_ROLE(), address(this)),
            "Contract missing permissions."
        );
        require(game.exists(id), "Item does not exist.");

        // Add to items map. There can be multiple amounts per item so the reward hash should take that into account.
        (uint256 lootboxId, bool result) = _addLootboxItem(contractAddress, id);
        items[lootboxId].rarity.add(uint256(rarity));
        uint256 rewardHashId = uint256(keccak256(abi.encodePacked(contractAddress, id, amount)));

        RewardSet storage rewards = rewardsList[uint8(rarity)];
        rewards.ids.add(rewardHashId);
        Reward storage rewardItem = rewards.map[rewardHashId];
        rewardItem.lootboxId = lootboxId;
        rewardItem.amount = amount;

        emit AddedReward(rewardHashId, result);
    }

    function registerRewardBatch(
        address contractAddress,
        uint256[] memory ids,
        Rarity[] memory rarities,
        uint256[] memory amounts
    ) 
        public
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(contractAddress)
    {
        require(ids.length == rarities.length && ids.length == amounts.length, "Input array length mismatch");
        
        // Todo: check that GameContractAddress is a Gamece
        // Check Gamener role
        Game game = Game(contractAddress);
        require(
            game.hasRole(game.BURNER_ROLE(), address(this)),
            "Contract missing permissions."
        );

        // Add to items map
        uint256[] memory hashIds;
        bool[] memory results;
        for (uint256 i = 0; i < ids.length; ++i) {
            require(game.exists(ids[i]), "Item does not exist.");

            // Add to items map. There can be multiple amounts per item so the reward hash should take 
            // that into account.
            (uint256 lootboxId, bool result) = _addLootboxItem(contractAddress, ids[i]);
            items[lootboxId].rarity.add(uint256(rarities[i]));
            uint256 rewardHashId = uint256(keccak256(abi.encodePacked(contractAddress, ids[i], amounts[i])));

            RewardSet storage rewards = rewardsList[uint8(rarities[i])];
            rewards.ids.add(rewardHashId);
            Reward storage rewardItem = rewards.map[rewardHashId];
            rewardItem.lootboxId = lootboxId;
            rewardItem.amount = amounts[i];

            hashIds[i] = rewardHashId;
            results[i] = result;
        }

        emit AddedRewardBatch(hashIds, results);
    }

    function generateLootbox(uint256[] memory ids, uint256[] memory amounts) public {
        require(ids.length == amounts.length, "Input array length mismatch");

        uint256 validInputCount = 0;
        
        // Count how many lootboxes the msg.sender can generate
        for (uint256 i = 0; i < ids.length; ++i) {
            if (itemIds.contains(ids[i])) {
                validInputCount += SafeMath.div(amounts[i], inputsList[ids[i]].requiredAmount);
            }
        }

        // Check to see if we can generate at least one lootbox given the input items
        uint256 lootboxCount = SafeMath.div(validInputCount, requiredInputItemsCount);
        require(lootboxCount > 0, "Insufficient Input");
        uint256 itemsToBurn = SafeMath.mul(lootboxCount, requiredInputItemsCount);
        
        // Burn items
        for (uint256 i = 0; i < ids.length; ++i) {
            if (itemIds.contains(ids[i]) && itemsToBurn > 0) {
                uint256 requiredAmount = inputsList[ids[i]].requiredAmount;
                uint256 count = SafeMath.div(amounts[i], requiredAmount);

                Game game = Game(items[ids[i]].gameContractAddress);
                if (itemsToBurn > count) {
                    game.burn(msg.sender, items[ids[i]].gameContractItemId, count * requiredAmount);
                    itemsToBurn -= count;
                } else {
                     game.burn(msg.sender, items[ids[i]].gameContractItemId, itemsToBurn * requiredAmount);
                    itemsToBurn = 0;
                }
            }
        }

        // Mint Lootbox
        _mint(msg.sender, LOOTBOX, lootboxCount, "");
        
        emit LootboxGenerated(lootboxCount);
    }

    function openLootbox(uint256 count) public {
        require(balanceOf(msg.sender, LOOTBOX) == count, "Invalid count");

        _burn(msg.sender, LOOTBOX, count);

        // Generate an item
        for (uint256 i = 0; i < count; ++i) {
            // random number between 1-100000
            uint32 rng = uint32(Utils.random(100000));

            // determine the rarity result
            uint8 rarity = uint8(probabilities.length) - 1;
            for (uint8 j = 0; j < uint8(probabilities.length); ++j) {
                if (rng < probabilities[j]) {
                    rarity = j;
                }
            }

            // random number between 0 and rewardsList.length
            require(rewardsList[rarity].ids.length() > 0, "Rewards List is empty");
            uint256 itemIndex = Utils.random(rewardsList[rarity].ids.length());
            Reward storage reward = rewardsList[rarity].map[rewardsList[rarity].ids.at(itemIndex)];

            ItemGameInfo storage item = items[reward.lootboxId];

            // Get Game Contracts
            Game game = Game(item.gameContractAddress);

            // Mint() will fail if this contract does not have the necessary permissions 
            game.mint(msg.sender, item.gameContractItemId, reward.amount);
        }
        emit LootboxOpened(count);
    }

    function getRewards(Rarity rarity) public view returns(uint256[] memory hashIds, uint256[] memory rewardCounts) {
        RewardSet storage rewardsSet = rewardsList[uint8(rarity)];
        for (uint256 i = 0; i < rewardsSet.ids.length(); ++i) {
            hashIds[i] = rewardsSet.map[rewardsSet.ids.at(i)].lootboxId;
            rewardCounts[i] = rewardsSet.map[rewardsSet.ids.at(i)].amount;
        }
    }

    function getInputItemCount(uint256 hashId) public view returns(uint256) {
        return inputsList[hashId].requiredAmount;
    }

    function getLootboxId(address contractAddress, uint256 id)
        public
        view
        checkAddressIsContract(contractAddress)
        returns(uint256)
    {
        return Utils.getId(contractAddress, id);
    }

    // // Todo: uncomment below. Compartmentalize contracts
    // function getRarity(uint256 hashId)
    //     public
    //     view
    //     returns(Rarity[] memory rarities)
    // {
    //     require(itemIds.contains(hashId), "Item does not exist.");
    //     ItemGameInfo storage item = items[hashId];
    //     for (uint256 i = 0; i < item.rarity.length(); ++i) {
    //         rarities[i] = Rarity(item.rarity.at(i));
    //     }
    // }

    // function setRequiredInputItemsCount(uint256 count) public checkPermissions(MANAGER_ROLE) {
    //     requiredInputItemsCount = count;
    // }

    // function getRequiredInputItemsCount() public view returns(uint256) {
    //     return requiredInputItemsCount;
    // }

    /******** Internal Functions ********/
    function _addLootboxItem(address contractAddress, uint256 id) internal returns (uint256 hashId, bool success) {
        hashId = Utils.getId(contractAddress, id);
        if (itemIds.add(hashId)) {
            ItemGameInfo storage item = items[hashId];
            item.gameContractAddress = contractAddress;
            item.gameContractItemId = id;
            success = true;
        }
        success = false;
    }
}