// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IGame.sol";
import "../interfaces/IGlobalItemRegistry.sol";

contract Game is ERC1155, Ownable, IGame {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    // using ERC165Checker for *;

    /******** Constants ********/
    // Todo: Replace this _IGAME interface 
    bytes4 private constant _INTERFACE_ID_IGAME = 0x55555555;
    uint256 private constant MAX_ITEM_RETURNED = 10;

    /******** Data Structures ********/
    struct Item {
        address payable creatorAddress;
        uint256 maxSupply;
    }

    /******** Stored Variables ********/
    address payable private gameManagerAddr;
    address private itemRegistryAddr;
    EnumerableSet.UintSet private idSet;
    mapping(uint256 => Item) private items;
    mapping(uint256 => uint256) public currentSupply;

    /******** Modifiers ********/
    modifier onlyGameManager() {
        require(gameManagerAddr == msg.sender, "Invalid Access");
        _;
    }

    /******** Public API ********/
    // url: "https://game.example/api/item/{id}.json"
    constructor(string memory _url, address _itemRegistryAddr) public ERC1155(_url) {
        require(Address.isContract(_itemRegistryAddr), "Address not valid");
        itemRegistryAddr = _itemRegistryAddr;
        _registerInterface(_INTERFACE_ID_IGAME);
    }
    
    /******** View Functions ********/
    function getGameManagerAddress() external view override returns(address) {
        return gameManagerAddr;
    }

    function contains(uint256 _id) external view override returns (bool) {
        return idSet.contains(_id);
    }

    function containsAll(uint256[] calldata _ids) external view override returns (bool) {
        for (uint256 i = 0; i < _ids.length; ++i) {
            if (!idSet.contains(_ids[i])) {
                return false;
            }
        }
        return true;
    }

    function length() external view override returns(uint256) {
        return idSet.length();
    }

    function listItems(uint256 offset) external view override returns(uint256[] memory idList, uint256 nextOffset) {
        require(offset < idSet.length(), "Invalid Offset");

        // Get the length of the array
        uint256 listLength = (offset + MAX_ITEM_RETURNED < idSet.length()) ? MAX_ITEM_RETURNED : idSet.length() - offset;
        idList = new uint[](listLength);
        for (uint256 i = offset; i < listLength; i++) {
            idList[i] = idSet.at(i);
        }
        // determine the next offset index
        nextOffset = offset + listLength;
    }

    function getItemInfo(uint256 _id) external view override returns(address, uint256)  {
        return (items[_id].creatorAddress, items[_id].maxSupply);
    }

    function getItemInfoBatch(uint256[] calldata _ids) external view override returns(address[] memory addrs, uint256[] memory supplies) {
        require(_ids.length <= MAX_ITEM_RETURNED, "Exceeds max item returns of 10");
        
        addrs = new address[](_ids.length);
        supplies = new uint256[](_ids.length);
        for (uint256 i = 0; i < _ids.length; ++i)
        {
            addrs[i] = items[_ids[i]].creatorAddress;
            supplies[i] = items[_ids[i]].maxSupply;
        }
    }

    /******** Mutative Functions ********/
    function setGameManagerAddress(address payable _newAddress) external override onlyOwner {
        gameManagerAddr = _newAddress;
    }
    
    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external override onlyGameManager {
        idSet.add(_id);
        Item storage item = items[_id];
        item.creatorAddress = _creatorAddress;
        item.maxSupply = _maxSupply;
        
        // Register item with in the global item registry
        itemRegistry().add(_id);
    }
    
    function createItemBatch(
        address payable _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    ) 
        external override onlyGameManager
    {
        require(_ids.length == _maxSupplies.length, "Parameter array size incorrect");
        for (uint i = 0; i < _ids.length; ++i) {
            idSet.add(_ids[i]);
            Item storage item = items[_ids[i]];
            item.creatorAddress = _creatorAddress;
            item.maxSupply = _maxSupplies[i];
        }
        
        // Register item with in the global item registry
        itemRegistry().addBatch(_ids);
    }

    /******** Game Manager API ********/
    function setUri(string calldata _newUri) external override onlyGameManager {
        _setURI(_newUri);
    }    
    
    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount) external override onlyGameManager {
        currentSupply[_itemId] += _amount;
        _mint(_receivingAddress, _itemId, _amount, "");
    }
    
    function mintBatch(address _receivingAddress, uint256[] calldata _itemIds, uint256[] calldata _amounts) external override onlyGameManager {
        for (uint i = 0; i < _itemIds.length; i++) {
            currentSupply[_itemIds[i]] += _amounts[i];
        }
        _mintBatch(_receivingAddress, _itemIds, _amounts, "");
    }

    function burn(address _account, uint256 _itemId, uint256 _amount) external override onlyGameManager {
        // _burn requirements are that account is non-zero and account has 
        // enough of these items
        _burn(_account, _itemId, _amount);

        // if _burn succeeds, then we know that totalSupply can be deducted.
        currentSupply[_itemId] -= _amount;
    }

    function burnBatch(address _account, uint256[] calldata _itemIds, uint256[] calldata _amounts) external override onlyGameManager {
        // _burnBatch requirements are that account is non-zero and account 
        // has enough of these items
        _burnBatch(_account, _itemIds, _amounts);

        // if _burnBatch succeeds, then we know that totalSupply can be 
        // deducted.
        for (uint i = 0; i < _itemIds.length; i++) {
            currentSupply[_itemIds[i]] -= _amounts[i];
        }
    }
    
    /******** Internal Functions ********/
    function itemRegistry() internal view returns(IGlobalItemRegistry) {
        return IGlobalItemRegistry(itemRegistryAddr);
    }
}