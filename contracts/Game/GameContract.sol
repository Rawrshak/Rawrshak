// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

// Todo: Figure out mechanism whether to cap item supply or not.
struct Item
{
    uint256 _uuid;
    string _url;
    uint256 _totalSupply;
    address payable _creatorAddress;
}

contract GameContract is ERC1155, AccessControl
{
    using EnumerableSet for EnumerableSet.UintSet;
    struct ItemSet {
        EnumerableSet.UintSet _inner;
        mapping(uint256 => Item) _itemList;
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
    function createItem(uint256 uuid, address payable creatorAddress) public returns (bool)
    {
        require(hasRole(ITEM_MANAGER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.add(uuid), "This item already exists.");

        Item storage item = _itemSet._itemList[uuid];
        item._uuid = uuid;
        item._url = this.uri(uuid);
        item._totalSupply = 0;
        item._creatorAddress = (creatorAddress == address(0)) ? _gamePayableAddress : creatorAddress;

        return true;
    }

    // CHRSUM - should I be able to delete items from under the players?
    // Delete the item
    function removeItem(uint256 uuid) public returns (bool)
    {
        require(hasRole(ITEM_MANAGER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.contains(uuid), "This item does not exist.");
        
        delete _itemSet._itemList[uuid];
        
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

    function getTotalSupply(uint256 id) public view returns(uint256)
    {
        require(_itemSet._inner.contains(id), "This item does not exist.");
        return _itemSet._itemList[id]._totalSupply;
    }

    function getCreatorAddress(uint256 id) public view returns(address)
    {
        require(_itemSet._inner.contains(id), "This item does not exist.");
        return _itemSet._itemList[id]._creatorAddress;
    }

    function mint(address receivingAddress, uint256 itemId, uint256 amount) public 
    {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.contains(itemId), "Item does not exist.");
        require(receivingAddress != address(0), "Cannot send to null adderss.");

        _itemSet._itemList[itemId]._totalSupply += amount;
        _mint(receivingAddress, itemId, amount, "");
    }

    function mintBatch(address receivingAddress, uint256[] memory itemIds, uint256[] memory amounts) public 
    {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(itemIds.length == amounts.length, "item arrays don't match.");
        require(receivingAddress != address(0), "Cannot send to null adderss.");

        for (uint i = 0; i < itemIds.length; i++)
        {
            require(_itemSet._inner.contains(itemIds[i]), "Item does not exist.");
            _itemSet._itemList[itemIds[i]]._totalSupply += amounts[i];
        }
        _mintBatch(receivingAddress, itemIds, amounts, "");
    }

    // Todo: Burning needs approval from the account
    function burn(address account, uint256 itemId, uint256 amount) public 
    {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(_itemSet._inner.contains(itemId), "Item does not exist.");
        require(account != address(0), "Cannot send to null adderss.");

        // _burn requirements are that account is non-zero and account has enough of these items
        _burn(account, itemId, amount);

        // if _burn succeeds, then we know that _totalSupply can be deducted.
        _itemSet._itemList[itemId]._totalSupply -= amount;
    }

    // Todo: Burning needs approval from the account
    function burnBatch(address account, uint256[] memory itemIds, uint256[] memory amounts) public 
    {
        require(hasRole(BURNER_ROLE, msg.sender), "Caller does not have the necessary permissions.");
        require(itemIds.length == amounts.length, "item arrays don't match.");
        require(account != address(0), "Cannot send to null adderss.");

        // _burnBatch requirements are that account is non-zero and account has enough of these items
        _burnBatch(account, itemIds, amounts);

        // if _burnBatch succeeds, then we know that _totalSupply can be deducted.
        for (uint i = 0; i < itemIds.length; i++)
        {
            require(_itemSet._inner.contains(itemIds[i]), "Item does not exist.");
            _itemSet._itemList[itemIds[i]]._totalSupply -= amounts[i];
        }
    }
}