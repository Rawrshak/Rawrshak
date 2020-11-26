// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IGame.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/ILootbox.sol";
import "../utils/Utils.sol";

// Todo: the key is actually Rarity, but enum as a map key has not been implemented yet
// Todo: Figure out what exactly to do for increasing the probabilities/multiplier per item. For now, just keep the 
//       probabilities flat.
// Todo: Developer can add multiple kinds of lootboxes per contract
// Todo: Lootbox Storage

contract Lootbox is ILootbox, AccessControl, Ownable, ERC1155 {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using SafeMath for *;
    using Utils for *;
    using ERC165Checker for *;

    /******** Constant ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /*
     *     bytes4(keccak256('registerInputItem(uint256,uint256,uint256)')) == 0xfa34d53c
     *     bytes4(keccak256('registerInputItemBatch(uint256[],uint256[],uint256[])')) == 0xa534c68e
     *     bytes4(keccak256('registerReward(uint256,Rarity,uint256)')) == 0x076ea9c8
     *     bytes4(keccak256('registerRewardBatch(uint256[],Rarity[],uint256[])')) == 0x0e38dbce
     *     bytes4(keccak256('generateLootbox(uint256[],uint256[])')) == 0xcadb08fa
     *     bytes4(keccak256('openLootbox(uint256)')) == 0x7ff48190
     *     bytes4(keccak256('getRewards(Rarity)')) == 0x586dd396
     *     bytes4(keccak256('getRequiredInputItemAmount(uint256)')) == 0x1354442e
     *     bytes4(keccak256('getRarity(uint256)')) == 0x48758697
     *     bytes4(keccak256('setTradeInMinimum(uint8)')) == 0x14743353
     *     bytes4(keccak256('getTradeInMinimum()')) == 0x10dfc82b
     *
     *     => 0xfa34d53c ^ 0xa534c68e ^ 0x076ea9c8 ^ 0x0e38dbce
     *      ^ 0xcadb08fa ^ 0x7ff48190 ^ 0x586dd396 ^ 0x1354442e
     *      ^ 0x48758697 ^ 0x14743353 ^ 0x10dfc82b == 0xe49e0289
     */
    bytes4 private constant _INTERFACE_ID_ILOOTBOX = 0xe49e0289;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x18028f85;

    /******** Constants ********/
    uint256 private LOOTBOX = 0;
    // uint8 private DEFAULT_REQUIRED_INPUT_ITEMS_AMOUNT = 4;

    struct Input {
        uint256 requiredAmount;
        uint256 multiplier;
        bool active;
    }

    struct Reward {
        uint256 uuid;
        uint256 amount;
        bool active;
    }

    /******** Stored Variables ********/
    // (uuid as key)
    mapping(uint256 => EnumerableSet.UintSet) private itemRarity;
    mapping(uint256 => Input) private inputsList;
    // uint8(Rarity.Common)
    mapping(uint8 => Reward[]) private rewardsList;
    uint8 private tradeInMinimum = 4;
    address globalItemRegistryAddr;
    // uint8(Rarity.Common)
    uint32[7] probabilities;
    
    /******** Events ********/
    event AddedInputItem(uint256);
    event AddedInputItemBatch(uint256[]);
    event AddedReward(uint256);
    event AddedRewardBatch(uint256[]);
    event LootboxGenerated(uint256);
    event LootboxOpened(uint256);

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(hasRole(role, msg.sender), "Caller missing permissions");
        _;
    }

    modifier checkItemExists(uint256 uuid) {
        require(globalItemRegistry().contains(uuid), "Item does not exist.");
        _;
    }

    /******** Public API ********/
    constructor(string memory _url, address _itemRegistryAddr) public ERC1155(_url) {
        globalItemRegistryAddr = _itemRegistryAddr;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _registerInterface(_INTERFACE_ID_ILOOTBOX);
        
        probabilities[uint8(Rarity.Mythic)] = 1;
        probabilities[uint8(Rarity.Exotic)] = 25;
        probabilities[uint8(Rarity.SuperRare)] = 200;
        probabilities[uint8(Rarity.Rare)] = 1000;
        probabilities[uint8(Rarity.Scarce)] = 5000;
        probabilities[uint8(Rarity.Uncommon)] = 25000;
        probabilities[uint8(Rarity.Common)] = 100000;
    }

    function setGlobalItemRegistryAddr(address _addr)
        public
        checkPermissions(MANAGER_ROLE)
    {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support IGame Interface."
        );
        globalItemRegistryAddr = _addr;
    }

    function registerInputItem(uint256 _uuid, uint256 _amount, uint256 _multiplier)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkItemExists(_uuid)
    {
        Input storage inputItem = inputsList[_uuid];
        inputItem.requiredAmount = _amount;
        inputItem.multiplier = _multiplier;
        inputItem.active = true;

        emit AddedInputItem(_uuid);
    }

    function registerInputItemBatch(
        uint256[] calldata _uuids,
        uint256[] calldata _amounts,
        uint256[] calldata _multipliers
    ) 
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(_uuids.length == _amounts.length && _uuids.length == _multipliers.length, "Array length mismatch");

        IGlobalItemRegistry registry = globalItemRegistry();
        for (uint256 i = 0; i < _uuids.length; ++i) {
            require(registry.contains(_uuids[i]), "Item does not exist.");

            Input storage inputItem = inputsList[_uuids[i]];
            inputItem.requiredAmount = _amounts[i];
            inputItem.multiplier = _multipliers[i];
            inputItem.active = true;
        }

        emit AddedInputItemBatch(_uuids);
    }

    function registerReward(uint256 _uuid, Rarity _rarity, uint256 _amount)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkItemExists(_uuid)
    {
        // add to item's rarity list if it doesn't already exist
        itemRarity[_uuid].add(uint256(_rarity));
        
        Reward memory rewardItem;
        rewardItem.uuid = _uuid;
        rewardItem.amount = _amount;
        rewardItem.active = true;
        rewardsList[uint8(_rarity)].push(rewardItem);

        emit AddedReward(_uuid);
    }

    function registerRewardBatch(
        uint256[] calldata _uuids,
        Rarity[] calldata _rarities,
        uint256[] calldata _amounts
    ) 
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(_uuids.length == _rarities.length && _uuids.length == _amounts.length, "Input array length mismatch");
        
        IGlobalItemRegistry registry = globalItemRegistry();

        for (uint256 i = 0; i < _uuids.length; ++i) {
            require(registry.contains(_uuids[i]), "Item does not exist.");

            // Add to items map. There can be multiple amounts per item so the reward hash should take 
            // that into account.
            // add to item's rarity list if it doesn't already exist
            itemRarity[_uuids[i]].add(uint256(_rarities[i]));
            
            Reward memory rewardItem;
            rewardItem.uuid = _uuids[i];
            rewardItem.amount = _amounts[i];
            rewardItem.active = true;
            rewardsList[uint8(_rarities[i])].push(rewardItem);
        }

        emit AddedRewardBatch(_uuids);
    }

    // Todo: instead of passing in amounts, just pass the ids, and then have the lootbox query
    //       for the data from the game
    function generateLootbox(uint256[] calldata _uuids, uint256[] calldata _amounts) external override {
        require(_uuids.length == _amounts.length, "Input array length mismatch");

        uint256 inputCount = 0;
        IGlobalItemRegistry registry = globalItemRegistry();
        
        // Count how many lootboxes the msg.sender can generate
        for (uint256 i = 0; i < _uuids.length; ++i) {
            if (registry.contains(_uuids[i])) {
                inputCount += SafeMath.div(_amounts[i], inputsList[_uuids[i]].requiredAmount);
            }
        }

        // Check to see if we can generate at least one lootbox given the input items
        uint256 lootboxCount = SafeMath.div(inputCount, tradeInMinimum);
        require(lootboxCount > 0, "Insufficient Input");
        inputCount = SafeMath.mul(lootboxCount, tradeInMinimum);
        
        // Burn items
        for (uint256 i = 0; i < _uuids.length; ++i) {
            if (registry.contains(_uuids[i]) && inputCount > 0) {
                uint256 requiredAmount = inputsList[_uuids[i]].requiredAmount;
                uint256 count = SafeMath.div(_amounts[i], requiredAmount);

                // Get game information
                (address gameAddr, uint256 gameId) = registry.getItemInfo(_uuids[i]);

                // Burn will fail if the user doesn't have enough items
                IGame game = IGame(gameAddr);
                if (inputCount > count) {
                    game.burn(msg.sender, gameId, count * requiredAmount);
                    inputCount -= count;
                } else {
                    game.burn(msg.sender, gameId, inputCount * requiredAmount);
                    inputCount = 0;
                }
            }
        }

        // Mint Lootbox
        _mint(msg.sender, LOOTBOX, lootboxCount, "");
        
        emit LootboxGenerated(lootboxCount);
    }

    function openLootbox(uint256 _count) external override {
        require(balanceOf(msg.sender, LOOTBOX) >= _count, "Invalid count");

        // burn will fail if there's not enough lootboxes
        _burn(msg.sender, LOOTBOX, _count);

        IGlobalItemRegistry registry = globalItemRegistry();

        // Generate an item
        for (uint256 i = 0; i < _count; ++i) {
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
            require(rewardsList[rarity].length > 0, "Rewards List is empty");
            uint256 itemIndex = Utils.random(rewardsList[rarity].length);
            Reward storage reward = rewardsList[rarity][itemIndex];

            // Get game information
            (address gameAddr, uint256 gameId) = registry.getItemInfo(reward.uuid);

            // Mint() will fail if this contract does not have the necessary permissions 
            IGame(gameAddr).mint(msg.sender, gameId, reward.amount);
        }
        emit LootboxOpened(_count);
    }

    function getRewards(Rarity _rarity)
        external
        view
        override
        returns(uint256[] memory uuids, uint256[] memory rewardCounts)
    {
        uuids = new uint256[](rewardsList[uint8(_rarity)].length);
        rewardCounts = new uint256[](rewardsList[uint8(_rarity)].length);
        for (uint256 i = 0; i < rewardsList[uint8(_rarity)].length; ++i) {
            uuids[i] = rewardsList[uint8(_rarity)][i].uuid;
            rewardCounts[i] = rewardsList[uint8(_rarity)][i].amount;
        }
    }

    function getRequiredInputItemAmount(uint256 _uuid) external view override returns(uint256) {
        return inputsList[_uuid].requiredAmount;
    }

    function getRarity(uint256 _uuid)
        external
        view
        override
        checkItemExists(_uuid)
        returns(Rarity[] memory rarities)
    {
        rarities = new Rarity[](itemRarity[_uuid].length());
        for (uint256 i = 0; i < itemRarity[_uuid].length(); ++i) {
            rarities[i] = Rarity(itemRarity[_uuid].at(i));
        }
    }

    function setTradeInMinimum(uint8 _count) external override checkPermissions(MANAGER_ROLE) {
        tradeInMinimum = _count;
    }

    function getTradeInMinimum() external view override returns(uint8) {
        return tradeInMinimum;
    }

    // /******** TEST Functions ********/
    // function mintLootbox(address account, uint256 amount) public {
    //     _mint(account, LOOTBOX, amount, "");
    // }

    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
}