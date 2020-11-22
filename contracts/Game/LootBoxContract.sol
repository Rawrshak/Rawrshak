// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "./GameContract.sol";

contract LootBoxContract is Ownable, AccessControl {
    // Todo: the key is actually Rarity, but enum as a map key has not been implemented yet

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
    }

    struct Input {
        uint256 requiredAmount;
        uint256 increaseProbabilityValue;
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

    /******** Roles ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }
    
    // uint8(Rarity.Common)
    mapping(uint8 => uint32) probabilities;

    /******** Public API ********/
    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _setupProbabilities();
    }

    /******** Internal Functions ********/
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