// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./GameContract.sol";

// Todo: the key is actually Rarity, but enum as a map key has not been implemented yet
// Todo: Figure out what exactly to do for increasing the probabilities/multiplier per item. For now, just keep the 
//       probabilities flat.
// Todo: Developer can add multiple kinds of lootboxes per contract

contract LootboxContract is AccessControl, ERC1155 {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using SafeMath for *;

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
    uint32[] probabilities;
    
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
        require(hasRole(role, msg.sender), "Caller does not have the necessary permissions.");
        _;
    }

    modifier checkAddressIsContract(address contractAddress) {
        require(Address.isContract(contractAddress), "Coin address is not valid");
        _;
    }

    /******** Public API ********/
    constructor(string memory url) public ERC1155(url) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setupProbabilities();
    }

    function registerInputItem(address contractAddress, uint256 id, uint256 amount, uint256 multiplier)
        public
        checkPermissions(MANAGER_ROLE)
        checkAddressIsContract(contractAddress)
    {
        // Todo: check that GameContractAddress is a GameContract interface
        // Check GameContract for burner role
        GameContract gameContract = GameContract(contractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Lootbox Contract doesn't have burning permissions."
        );
        require(gameContract.exists(id), "This item does not exist.");

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
        require(ids.length == amounts.length, "ids and amounts array length do not match.");
        require(ids.length == multipliers.length, "ids and multiplier array length do not match.");
        
        // Todo: check that GameContractAddress is a GameContract interface
        // Check GameContract for burner role
        GameContract gameContract = GameContract(contractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Lootbox Contract doesn't have burning permissions."
        );

        // Add to items map
        uint256[] memory hashIds;
        bool[] memory results;
        for (uint256 i = 0; i < ids.length; ++i) {
            require(gameContract.exists(ids[i]), "This item does not exist.");

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
        // Todo: check that GameContractAddress is a GameContract interface
        // Check GameContract for burner role
        GameContract gameContract = GameContract(contractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Lootbox Contract doesn't have burning permissions."
        );
        require(gameContract.exists(id), "This item does not exist.");

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
        require(ids.length == rarities.length, "ids and raruties array length do not match.");
        require(ids.length == amounts.length, "ids and amounts array length do not match.");
        
        // Todo: check that GameContractAddress is a GameContract interface
        // Check GameContract for burner role
        GameContract gameContract = GameContract(contractAddress);
        bytes32 burner_role = gameContract.BURNER_ROLE();
        require(
            gameContract.hasRole(burner_role, address(this)),
            "This Lootbox Contract doesn't have burning permissions."
        );

        // Add to items map
        uint256[] memory hashIds;
        bool[] memory results;
        for (uint256 i = 0; i < ids.length; ++i) {
            require(gameContract.exists(ids[i]), "This item does not exist.");

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
        require(ids.length == amounts.length, "ids and amounts array length do not match.");

        uint256 validInputCount = 0;
        
        // Count how many lootboxes the msg.sender can generate
        for (uint256 i = 0; i < ids.length; ++i) {
            if (itemIds.contains(ids[i])) {
                uint256 requiredAmount = inputsList[ids[i]].requiredAmount;
                uint256 count = SafeMath.div(amounts[i], requiredAmount);

                validInputCount += count;
            }
        }

        // Check to see if we can generate at least one lootbox given the input items
        uint256 lootboxCount = SafeMath.div(validInputCount, requiredInputItemsCount);
        require(lootboxCount > 0, "There aren't enough input items.");
        uint256 itemsToBurn = SafeMath.mul(lootboxCount, requiredInputItemsCount);
        
        // Burn items
        for (uint256 i = 0; i < ids.length; ++i) {
            if (itemIds.contains(ids[i]) && itemsToBurn > 0) {
                uint256 requiredAmount = inputsList[ids[i]].requiredAmount;
                uint256 count = SafeMath.div(amounts[i], requiredAmount);

                GameContract gameContract = GameContract(items[ids[i]].gameContractAddress);
                if (itemsToBurn > count) {
                    gameContract.burn(msg.sender, items[ids[i]].gameContractItemId, count * requiredAmount);
                    itemsToBurn -= count;
                } else {
                    gameContract.burn(msg.sender, items[ids[i]].gameContractItemId, itemsToBurn * requiredAmount);
                    itemsToBurn = 0;
                }
            }
        }

        // Mint Lootbox
        _mint(msg.sender, LOOTBOX, lootboxCount, "");
        
        emit LootboxGenerated(lootboxCount);
    }

    function openLootbox(uint256 count) public {
        require(balanceOf(msg.sender, LOOTBOX) == count, "User does not own enough lootboxes.");

        _burn(msg.sender, LOOTBOX, count);

        // Generate an item
        for (uint256 i = 0; i < count; ++i) {
            // random number between 1-100000
            uint32 rng = uint32(_random(100000));

            // determine the rarity result
            uint8 rarity = _getRarity(rng);

            // random number between 0 and rewardsList.length
            require(rewardsList[uint8(rarity)].ids.length() > 0, "There are no items in this rarity level");
            uint256 itemIndex = _random(rewardsList[rarity].ids.length());
            uint256 rewardId = rewardsList[rarity].ids.at(itemIndex);
            Reward storage reward = rewardsList[rarity].map[rewardId];

            ItemGameInfo storage item = items[reward.lootboxId];

            // Get Game Contracts
            GameContract gameContract = GameContract(item.gameContractAddress);

            // Mint() will fail if this contract does not have the necessary permissions 
            gameContract.mint(msg.sender, item.gameContractItemId, reward.amount);
        }
        emit LootboxOpened(count);
    }

    function getRewards(Rarity /*rarity*/) public view /*returns(uint256[] ids)*/ {
        // Todo: returns the item ids in the rarity band
    }

    function getLootboxId(address contractAddress, uint256 id)
        public
        view
        checkAddressIsContract(contractAddress)
        returns(uint256)
    {
        return _getId(contractAddress, id);
    }

    function getRarity(uint256 /*hashId*/)
        public
        view
        // returns(Rarity[])
    {
        // Todo: returns rarities
    }

    function setRequiredInputItemsCount(uint256 count) public checkPermissions(MANAGER_ROLE) {
        requiredInputItemsCount = count;
    }

    function getRequiredInputItemsCount() public view returns(uint256) {
        return requiredInputItemsCount;
    }

    /******** Internal Functions ********/
    function _getId(address contractAddress, uint256 id) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(contractAddress, id)));
    }

    function _getRarity(uint32 rng) internal view returns(uint8) {
        for (uint8 i = 0; i < probabilities.length; ++i) {
            if (rng < probabilities[i]) {
                return i;
            }
        }
        return uint8(Rarity.Common);
    }

    function _setupProbabilities() private {
        probabilities[uint8(Rarity.Mythic)] = 1;
        probabilities[uint8(Rarity.Exotic)] = 25;
        probabilities[uint8(Rarity.SuperRare)] = 200;
        probabilities[uint8(Rarity.Rare)] = 1000;
        probabilities[uint8(Rarity.Scarce)] = 5000;
        probabilities[uint8(Rarity.Uncommon)] = 25000;
        probabilities[uint8(Rarity.Common)] = 100000;
    }

    function _addLootboxItem(address contractAddress, uint256 id) internal returns (uint256 hashId, bool success) {
        hashId = _getId(contractAddress, id);
        if (itemIds.add(hashId)) {
            ItemGameInfo storage item = items[hashId];
            item.gameContractAddress = contractAddress;
            item.gameContractItemId = id;
            success = true;
        }
        success = false;
    }

    function _random(uint256 modulus) internal view returns (uint256) {
        return uint(keccak256(abi.encodePacked(now, msg.sig, block.timestamp))) % modulus;
    }
}