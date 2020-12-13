// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interfaces/IGameManager.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/ILootbox.sol";
import "../interfaces/ILootboxManager.sol";
import "../utils/Utils.sol";

// Todo: the key is actually Rarity, but enum as a map key has not been implemented yet
// Todo: Figure out what exactly to do for increasing the probabilities/multiplier per item.
//       For now, just keep the probabilities flat.

contract Lootbox is ILootbox, Ownable, ERC1155 {
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
    bytes4 private constant _INTERFACE_ID_ILOOTBOX = 0x00000009;
    bytes4 private constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A; // Todo:
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;

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
    mapping(uint256 => Input) private inputsList;
    // uint8(Rarity.Common)
    mapping(uint8 => Reward[]) private rewardsList;
    uint8 private tradeInMinimum = 4;
    address globalItemRegistryAddr;
    address lootboxManagerAddr;
    // uint8(Rarity.Common)
    uint32[7] private probabilities;
    
    /******** Events ********/
    event LootboxGenerated(uint256);
    event LootboxOpened(uint256);

    /******** Modifiers ********/
    modifier onlyManager() {
        require(lootboxManagerAddr == msg.sender, "Invalid Access");
        _;
    }

    /******** Public API ********/
    constructor(address _addr, string memory _url) public ERC1155(_url) {
        require(
            ERC165Checker.supportsInterface(msg.sender, _INTERFACE_ID_ILOOTBOXFACTORY),
            "Caller does not support Interface."
        );
        globalItemRegistryAddr = _addr;

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
        external
        override
        onlyOwner
    {
        globalItemRegistryAddr = _addr;
    }

    function setLootboxManager(address _addr)
        external
        onlyOwner
    {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_ILOOTBOXMANAGER),
            "Caller does not support Interface."
        );
        lootboxManagerAddr = _addr;
    }

    function getLootboxManagerAddress() external view override returns(address) {
        return lootboxManagerAddr;
    }

    function registerInputItem(uint256 _uuid, uint256 _amount, uint256 _multiplier)
        external
        override
        onlyManager
    {
        Input storage inputItem = inputsList[_uuid];
        inputItem.requiredAmount = _amount;
        inputItem.multiplier = _multiplier;
        inputItem.active = true;
    }

    function registerInputItemBatch(
        uint256[] calldata _uuids,
        uint256[] calldata _amounts,
        uint256[] calldata _multipliers
    ) 
        external
        override
        onlyManager
    {
        for (uint256 i = 0; i < _uuids.length; ++i) {
            Input storage inputItem = inputsList[_uuids[i]];
            inputItem.requiredAmount = _amounts[i];
            inputItem.multiplier = _multipliers[i];
            inputItem.active = true;
        }
    }

    function registerReward(uint256 _uuid, Rarity _rarity, uint256 _amount)
        external
        override
        onlyManager
    {        
        Reward memory rewardItem;
        rewardItem.uuid = _uuid;
        rewardItem.amount = _amount;
        rewardItem.active = true;
        rewardsList[uint8(_rarity)].push(rewardItem);
    }

    function registerRewardBatch(
        uint256[] calldata _uuids,
        Rarity[] calldata _rarities,
        uint256[] calldata _amounts
    ) 
        external
        override
        onlyManager
    {

        for (uint256 i = 0; i < _uuids.length; ++i) {            
            Reward memory rewardItem;
            rewardItem.uuid = _uuids[i];
            rewardItem.amount = _amounts[i];
            rewardItem.active = true;
            rewardsList[uint8(_rarities[i])].push(rewardItem);
        }
    }

    function setTradeInMinimum(uint8 _count) external override onlyManager {
        tradeInMinimum = _count;
    }


    // Todo: instead of passing in amounts, just pass the ids, and then have the lootbox query
    //       for the data from the game. If the user doesn't have enough items, just call a revert()
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
                (, address gameManagerAddr, uint256 gameId) = registry.getItemInfo(_uuids[i]);

                // Burn will fail if the user doesn't have enough items
                // Todo: create a new interface for just getting the game manager
                IGameManager gameManager = IGameManager(gameManagerAddr);
                if (inputCount > count) {
                    gameManager.burn(msg.sender, gameId, SafeMath.mul(count, requiredAmount));
                    inputCount -= count;
                } else {
                    gameManager.burn(msg.sender, gameId, SafeMath.mul(inputCount, requiredAmount));
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
            (, address gameManagerAddr, uint256 gameId) = registry.getItemInfo(reward.uuid);
            IGameManager gameManager = IGameManager(gameManagerAddr);

            // Mint() will fail if this contract does not have the necessary permissions 
            gameManager.mint(msg.sender, gameId, reward.amount);
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