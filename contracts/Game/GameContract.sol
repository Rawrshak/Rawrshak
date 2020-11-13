// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

struct Item
{
    uint256 _uuid;
    string _url;
    uint256 _totalSupply;
    address payable _creatorAddress;
    mapping(address => uint) _balances;
}


contract GameContract is ERC1155, AccessControl
{
    using EnumerableSet for EnumerableSet.UintSet;
    struct ItemSet {
        EnumerableSet.UintSet _inner;
        mapping(uint256 => Item) ItemList;
    }

    /******** Stored Variables ********/
    // This is the address where transactions are sent to.
    address payable private _gamePayableAddress;
    ItemSet private _itemSet;

    /******** Events ********/
    event GamePayableAddressChanged(address);

    /******** Roles ********/
    bytes32 public constant GAME_OWNER_ROLE = keccak256("GAME_OWNER_ROLE");
    // These addresses should probably belong to the server api that the game and 
    // developer app interfaces with.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ITEM_MANAGER_ROLE = keccak256("ITEM_MANAGER_ROLE");

    // url: "https://game.example/api/item/{id}.json"
    constructor(string memory url) public ERC1155(url)
    {
        // Contract Deployer is now the owner and can set roles
        _gamePayableAddress = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GAME_OWNER_ROLE, msg.sender);
    }

    // GamePayableAddress getter
    function getGamePayableAddress() public view returns(address payable)
    {
        return _gamePayableAddress;
    }

    // GamePayableAddress setter
    function setGamePayableAddress(address payable newAddress) public
    {
        require(hasRole(GAME_OWNER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        _gamePayableAddress = newAddress;
        emit GamePayableAddressChanged(newAddress);
    }

    // chrsum-todo: figure out whether I want to do create an ItemList Structure or not.
    // Create New Item
    function createItem(uint256 uuid) public returns (bool)
    {
        require(hasRole(ITEM_MANAGER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.add(uuid), "This item already exists.");

        Item storage item = _itemSet.ItemList[uuid];
        item._uuid = uuid;
        item._url = this.uri(uuid);
        item._totalSupply = 0;
        item._creatorAddress = _gamePayableAddress;

        return true;
    }

    // Delete the item
    function removeItem(uint256 uuid) public returns (bool)
    {
        require(hasRole(ITEM_MANAGER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.contains(uuid), "This item does not exist.");
        
        delete _itemSet.ItemList[uuid];
        
        return _itemSet._inner.remove(uuid);
    }
    
    // check if the item exists
    function exists(uint256 uuid) public view returns (bool)
    {
        return _itemSet._inner.contains(uuid);
    }

    // Get Length of the item list
    function length() public view returns (uint256)
    {
        return _itemSet._inner.length();
    }

    // Returns an array of UUIDs
    function getAllItems() public view returns(uint256[] memory)
    {
        uint256 len = _itemSet._inner.length();
        require(len != 0, "The list is empty.");

        uint256[] memory uuidList = new uint[](len);
        for (uint256 index = 0; index < len; index++)
        {
            uuidList[index] = _itemSet._inner.at(index);
        }

        return uuidList;
    }

    // Todo: Add item creation/deletion tests
    // Todo: mint and burn items
    // Todo: Add item minting/burning tests
    // Todo: Query Items
}