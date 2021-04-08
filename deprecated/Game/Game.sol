// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/IGame.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../../utils/Constants.sol";

contract Game is ERC1155, Ownable, IGame, ERC165Storage {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    // using ERC165Checker for *;

    /******** Constants ********/
    uint256 private constant MAX_ITEM_RETURNED = 10;

    /******** Data Structures ********/
    struct Item {
        address payable creatorAddress;
        uint256 maxSupply;
    }

    /******** Stored Variables ********/
    uint256 public gameId;
    address private gameManagerAddr;
    address private itemRegistryAddr;
    EnumerableSet.UintSet private idSet;
    mapping(uint256 => Item) private items;
    mapping(uint256 => uint256) public currentSupply;
    
    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);
    event GameManagerSet(uint256 gameId, address managerAddr);
    event GameUriUpdated(uint256 gameId, string url);
    event ItemCreated(uint256 gameId, uint256 id, address creatorAddr, uint256 maxSupply);
    event ItemBatchCreated(uint256 gameId, uint256[] ids, address creatorAddr, uint256[] maxSupplies);
    event ItemSupplyChanged(uint256 gameId, uint256 id, uint256 currentSupply);
    event ItemBatchSupplyChanged(uint256 gameId, uint256[] ids, uint256[] currentSupplies);

    /******** Modifiers ********/
    modifier onlyManager() {
        require(gameManagerAddr == msg.sender, "Invalid Access");
        _;
    }

    /******** Public API ********/
    // url: "https://game.example/api/item/{id}.json"
    constructor(uint256 _gameId, string memory _url, address _itemRegistryAddr) ERC1155(_url) {
        require(
            ERC165Checker.supportsInterface(msg.sender, Constants._INTERFACE_ID_IGAMEFACTORY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _itemRegistryAddr;
        gameId = _gameId;
        _registerInterface(Constants._INTERFACE_ID_IGAME);
    }
    
    /******** View Functions ********/
    function getManagerAddress() external view override returns(address) {
        return gameManagerAddr;
    }

    function contains(uint256 _id) external view override returns (bool) {
        return idSet.contains(_id);
    }

    function length() external view override returns(uint256) {
        return idSet.length();
    }

    function getItemInfo(uint256 _id) external view override returns(address, uint256)  {
        return (items[_id].creatorAddress, items[_id].maxSupply);
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155, ERC165Storage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /******** Mutative Functions ********/
    function setGlobalItemRegistryAddr(address _addr)
        external
        override
        onlyOwner
    {
        itemRegistryAddr = _addr;
        emit GlobalItemRegistryStored(address(this), _addr, Constants._INTERFACE_ID_IGAME);
    }

    function setManagerAddress(address _newAddress) external override onlyOwner {
        require(
            ERC165Checker.supportsInterface(_newAddress, Constants._INTERFACE_ID_IGAMEMANAGER),
            "Caller does not support Interface."
        );
        gameManagerAddr = _newAddress;
        emit GameManagerSet(gameId, _newAddress);
    }
    
    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external override onlyManager {
        idSet.add(_id);
        Item storage item = items[_id];
        item.creatorAddress = _creatorAddress;
        item.maxSupply = _maxSupply;
        
        // Register item with in the global item registry
        itemRegistry().add(_id);
        emit ItemCreated(gameId, _id, _creatorAddress, _maxSupply);
    }
    
    function createItemBatch(
        address payable _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    ) 
        external override onlyManager
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
        emit ItemBatchCreated(gameId, _ids, _creatorAddress, _maxSupplies);
    }

    /******** Game Manager API ********/
    function setUri(string calldata _newUri) external override onlyManager {
        _setURI(_newUri);
        emit GameUriUpdated(gameId, _newUri);
    }    
    
    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount) external override onlyManager {
        currentSupply[_itemId] += _amount;
        _mint(_receivingAddress, _itemId, _amount, "");
        emit ItemSupplyChanged(gameId, _itemId, currentSupply[_itemId]);
    }
    
    function mintBatch(address _receivingAddress, uint256[] calldata _itemIds, uint256[] calldata _amounts) external override onlyManager {
        uint256[] memory currentSupplies = new uint256[](_itemIds.length);
        for (uint i = 0; i < _itemIds.length; i++) {
            currentSupply[_itemIds[i]] += _amounts[i];
            currentSupplies[i] = currentSupply[_itemIds[i]];
        }
        _mintBatch(_receivingAddress, _itemIds, _amounts, "");
        emit ItemBatchSupplyChanged(gameId, _itemIds, currentSupplies);
    }

    function burn(address _account, uint256 _itemId, uint256 _amount) external override onlyManager {
        // _burn requirements are that account is non-zero and account has 
        // enough of these items
        _burn(_account, _itemId, _amount);

        // if _burn succeeds, then we know that totalSupply can be deducted.
        currentSupply[_itemId] -= _amount;
        
        emit ItemSupplyChanged(gameId, _itemId, currentSupply[_itemId]);
    }

    function burnBatch(address _account, uint256[] calldata _itemIds, uint256[] calldata _amounts) external override onlyManager {
        // _burnBatch requirements are that account is non-zero and account 
        // has enough of these items
        _burnBatch(_account, _itemIds, _amounts);

        // if _burnBatch succeeds, then we know that totalSupply can be 
        // deducted.
        uint256[] memory currentSupplies = new uint256[](_itemIds.length);
        for (uint i = 0; i < _itemIds.length; i++) {
            currentSupply[_itemIds[i]] -= _amounts[i];
            currentSupplies[i] = currentSupply[_itemIds[i]];
        }
        
        emit ItemBatchSupplyChanged(gameId, _itemIds, currentSupplies);
    }
    
    /******** Internal Functions ********/
    function itemRegistry() internal view returns(IGlobalItemRegistry) {
        return IGlobalItemRegistry(itemRegistryAddr);
    }
}