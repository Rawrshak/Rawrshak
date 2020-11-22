// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./GameContract.sol";

contract LootboxContract is Ownable, AccessControl, ERC1155 {
    // Todo: the key is actually Rarity, but enum as a map key has not been implemented yet

    /******** Constants ********/
    uint256 public LOOTBOX = 0;

    /******** Enums ********/
    enum Rarity {
        Common,
        Uncommon,
        Scarce,
        Rare,
        SuperRare,
        Exotic,
        Mythic
    }

    /******** Data Structures ********/
    struct ItemGameInfo {
        address gameContractAddress;
        uint256 gameContractItemId;
        EnumerableSet.UintSet rarity;
    }

    struct Input {
        uint256 requiredAmount;
        uint256 increaseProbabilityValue; // Todo:
    }

    struct Reward {
        uint256 id;
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
    
    /******** Events ********/
    event ItemRegistered(uint256);
    event ItemRegisteredBatch(uint256[]);
    event ItemInputItem(uint256);
    event ItemInputItemBatch(uint256[]);
    event ItemReward(uint256);
    event ItemRewardBatch(uint256[]);
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
    
    // uint8(Rarity.Common)
    mapping(uint8 => uint32) probabilities;

    /******** Public API ********/
    constructor(string memory url) public ERC1155(url) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setupProbabilities();
    }

    function registerItem(/*address contractAddress, uint256 id*/) public {
        // Todo:
        emit ItemRegistered(0);
    }

    function registerItemBatch(/*address[] contractAddresses, uint256[] ids*/) public {
        // Todo:
        // emit ItemRegisteredBatch(uint256[]);
    }

    function registerInputItem(/*uint256 id, uint256 amount, uint256 increaseProbability*/) public {
        // Todo:
        emit ItemRegistered(0);
    }

    function registerInputItemBatch(/*uint256[] ids, uint256[] amounts, uint256[] increaseProbabilities*/) public {
        // Todo:
        // emit ItemRegisteredBatch(uint256[]);
    }

    function registerReward(/*uint256 id, Rarity rarity, uint256 amount*/) public {
        // Todo:
        // emit RewardRegistered()
    }

    function registerRewardBatch(/*uint256[] ids, Rarity[] rarities, uint256[] amounts*/) public {
        // Todo:
        // emit RewradRegistered()
    }

    function generateLootbox(/*address user, uint256[] ids*/) public {
        // Todo: Generate a Lootbox for the user. It will send those lootboxes to the user's wallet
        emit LootboxGenerated(0);
    }

    function openLootbox(/*address user, uint256 count*/) public {
        // Todo: Open Lootboxes that the user has
        //       Generate a random item to reward the user with
        emit LootboxOpened(0);
    }

    function openLootbox(address /*user*/, uint256 /*count*/) public {
        // Todo: Open Lootboxes that the user has
        //       Generate a random item to reward the user with
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

    /******** Internal Functions ********/
    function _getId(address contractAddress, uint256 id) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(contractAddress, id)));
    }

    function _setupProbabilities() private {
        probabilities[uint8(Rarity.Common)] = 75000;
        probabilities[uint8(Rarity.Uncommon)] = 20000;
        probabilities[uint8(Rarity.Scarce)] = 4000;
        probabilities[uint8(Rarity.Rare)] = 800;
        probabilities[uint8(Rarity.SuperRare)] = 175;
        probabilities[uint8(Rarity.Exotic)] = 24;
        probabilities[uint8(Rarity.Mythic)] = 1;
    }

}