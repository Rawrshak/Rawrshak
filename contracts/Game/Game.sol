// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IGame.sol";
import "./ItemInfoStorage.sol";

contract Game is IGame, ERC1155, AccessControl {
    using EnumerableSet for EnumerableSet.UintSet;

    /******** Data Structures ********/
    

    /******** Stored Variables ********/
    // This is the address where transactions are sent to.
    address payable private gamePayableAddress;
    address itemInfoStorageAddr;
    mapping(uint256 => uint256) currentSupply;

    /******** Events ********/
    event GamePayableAddressChanged(address);
    event ItemCreated(uint256);
    event ItemCreatedBatch(uint256[]);
    event ItemMinted(uint256,uint256);
    event ItemBurned(uint256,uint256);
    event ItemMintedBatch(uint256[],uint256[]);
    event ItemBurnedBatch(uint256[],uint256[]);

    /******** Roles ********/
    bytes32 public constant GAME_OWNER_ROLE = keccak256("GAME_OWNER_ROLE");
    // These addresses should probably belong to the server api that the game 
    // and developer app interfaces with.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    /******** Public API ********/
    // url: "https://game.example/api/item/{id}.json"
    constructor(string memory url) public ERC1155(url) {
        // Contract Deployer is now the owner and can set roles
        gamePayableAddress = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GAME_OWNER_ROLE, msg.sender);

        // Create Item Info Storage
        itemInfoStorageAddr = address(new ItemInfoStorage());
    }

    // GamePayableAddress getter
    function getGamePayableAddress() external view override returns(address payable) {
        return gamePayableAddress;
    }

    // GamePayableAddress setter
    function setGamePayableAddress(address payable newAddress) 
        external
        override
        checkPermissions(GAME_OWNER_ROLE)
    {
        gamePayableAddress = newAddress;
        emit GamePayableAddressChanged(newAddress);
    }

    // Create New Item
    function createItem(address _creatorAddress, uint256 _id, uint256 _maxSupply) external override {
        require(!itemInfoStorage().contains(_id), "Item already exists.");
        
        // Add item to item storage
        itemInfoStorage().createItem(
            (_creatorAddress != address(0)) ? payable(_creatorAddress) : gamePayableAddress,
            _id,
            _maxSupply);
        
        // mint max supply if there is a max supply
        _mint(
            (_creatorAddress != address(0)) ? payable(_creatorAddress) : gamePayableAddress,
            _id,
            _maxSupply,
            "");

        currentSupply[_id] = _maxSupply;

        emit ItemCreated(_id);
    }

    function createItemBatch(
        address _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    )
        external
        override
    {
        require(_ids.length == _maxSupplies.length, "IDs and Max Supply array size do not match");
        for (uint256 i = 0; i < _ids.length; ++i) {
            require(!itemInfoStorage().contains(_ids[i]), "Item already exists.");
        }
        
        itemInfoStorage().createItemBatch(
            (_creatorAddress != address(0)) ? payable(_creatorAddress) : gamePayableAddress,
            _ids,
            _maxSupplies);

        _mintBatch(
            (_creatorAddress != address(0)) ? payable(_creatorAddress) : gamePayableAddress,
            _ids,
            _maxSupplies,
            "");
        
        for (uint256 i = 0; i < _ids.length; ++i) {
            currentSupply[_ids[i]] = _maxSupplies[i];
        }

        emit ItemCreatedBatch(_ids);
    }
    
    // check if the item exists
    function contains(uint256 _id) external override view returns (bool) {
        return itemInfoStorage().contains(_id);
    }

    // Get Length of the item list
    function length() external override view returns (uint256) {
        return itemInfoStorage().length();
    }

    // Returns an array of IDs
    function getAllItems() external override view returns(uint256[] memory) {
        return itemInfoStorage().listItems();
    }

    function getTotalSupply(uint256 _id) external override view returns(uint256) {
        return currentSupply[_id];
    }

    function getMaxSupply(uint256 _id) external override view returns(uint256 maxSupply) {
        (, maxSupply) = itemInfoStorage().getItemInfo(_id);
    }

    function getCreatorAddress(uint256 _id) external override view returns(address creatorAddress) {
        (creatorAddress, ) = itemInfoStorage().getItemInfo(_id);
    }

    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount)
        external
        override
        checkPermissions(MINTER_ROLE)
    {
        require(itemInfoStorage().contains(_itemId), "Item does not exist");
        require(_receivingAddress != address(0), "Invalid address");

        (, uint256 maxSupply) = itemInfoStorage().getItemInfo(_itemId);
        require(maxSupply == 0 || maxSupply >= currentSupply[_itemId] + _amount, "Supply cannot be increased");

        currentSupply[_itemId] += _amount;
        _mint(_receivingAddress, _itemId, _amount, "");
        emit ItemMinted(_itemId, _amount);
    }

    // mint several items to a single addreess
    // Todo: mint single item to several addresses
    // Todo: mint several items to several addresses
    function mintBatch(
        address _receivingAddress,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    )
        external
        override
        checkPermissions(MINTER_ROLE)
    {
        require(_itemIds.length == _amounts.length, "item arrays don't match.");
        require(_receivingAddress != address(0), "Invalid address");

        for (uint i = 0; i < _itemIds.length; i++) {
            require(itemInfoStorage().contains(_itemIds[i]), "Item does not exist");

            (, uint256 maxSupply) = itemInfoStorage().getItemInfo(_itemIds[i]);
            require(
                maxSupply == 0 || maxSupply >= currentSupply[_itemIds[i]] + _amounts[i],
                "Supply cannot be increased"
            );

            currentSupply[_itemIds[i]] += _amounts[i];
        }
        _mintBatch(_receivingAddress, _itemIds, _amounts, "");
        emit ItemMintedBatch(_itemIds, _amounts);
    }

    function burn(address _account, uint256 _itemId, uint256 _amount)
        external
        override
        checkPermissions(BURNER_ROLE)
    {
        require(itemInfoStorage().contains(_itemId), "Item does not exist");
        require(_account != address(0), "Invalid address");

        // _burn requirements are that account is non-zero and account has 
        // enough of these items
        _burn(_account, _itemId, _amount);

        // if _burn succeeds, then we know that totalSupply can be deducted.
        currentSupply[_itemId] -= _amount;
        emit ItemBurned(_itemId, _amount);
    }

    function burnBatch(
        address _account,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    )
        external
        override
        checkPermissions(BURNER_ROLE)
    {
        require(_itemIds.length == _amounts.length, "item arrays don't match.");
        require(_account != address(0), "Invalid address");

        // _burnBatch requirements are that account is non-zero and account 
        // has enough of these items
        _burnBatch(_account, _itemIds, _amounts);

        // if _burnBatch succeeds, then we know that totalSupply can be 
        // deducted.
        for (uint i = 0; i < _itemIds.length; i++) {
            currentSupply[_itemIds[i]] -= _amounts[i];
        }
        emit ItemBurnedBatch(_itemIds, _amounts);
    }

    // internal 
    function itemInfoStorage() internal view returns(ItemInfoStorage) {
        return ItemInfoStorage(itemInfoStorageAddr);
    }
}