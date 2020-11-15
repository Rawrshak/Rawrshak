// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";

contract GameContract is ERC1155, AccessControl
{
    using EnumerableSet for EnumerableSet.UintSet;

    /******** Data Structures ********/
    // Todo: Figure out mechanism whether to cap item supply or not.
    struct Item {
        uint256 uuid;
        uint256 totalSupply;
        bool isSupplyCapped;
        address payable creatorAddress;
    }

    struct ItemSet {
        EnumerableSet.UintSet idSet;
        mapping(uint256 => Item) itemsList;
    }

    /******** Stored Variables ********/
    // This is the address where transactions are sent to.
    address payable private gamePayableAddress;
    ItemSet private itemsMap;

    /******** Events ********/
    event GamePayableAddressChanged(address);
    event ItemCreated(uint256);
    event ItemRemoved(uint256);
    event ItemMinted(uint256,uint256);
    event ItemBurned(uint256,uint256);

    /******** Roles ********/
    bytes32 public constant GAME_OWNER_ROLE = keccak256("GAME_OWNER_ROLE");
    // These addresses should probably belong to the server api that the game 
    // and developer app interfaces with.
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ITEM_MANAGER_ROLE = keccak256("ITEM_MANAGER_ROLE");

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 role) {
        require(
            hasRole(role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }

    // url: "https://game.example/api/item/{id}.json"
    constructor(string memory url) public ERC1155(url) {
        // Contract Deployer is now the owner and can set roles
        gamePayableAddress = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(GAME_OWNER_ROLE, msg.sender);
    }

    // GamePayableAddress getter
    function getGamePayableAddress() public view  returns(address payable) {
        return gamePayableAddress;
    }

    // GamePayableAddress setter
    function setGamePayableAddress(address payable newAddress) 
        public 
        checkPermissions(GAME_OWNER_ROLE)
    {
        gamePayableAddress = newAddress;
        emit GamePayableAddressChanged(newAddress);
    }

    // Create New Item
    function createItem(uint256 id) public
    {
        _createItem(id, gamePayableAddress, 0);
    }

    function createItem(uint256 id, address creatorAddress) public
    {
        _createItem(id, payable(creatorAddress), 0);
    }

    function createItem(
        uint256 id,
        address creatorAddress,
        uint256 maxSupply
    )
        public
    {
        _createItem(id, payable(creatorAddress), maxSupply);
        _mint(creatorAddress, id, maxSupply, "");
    }

    // Delete the item
    function deleteItem(uint256 id) public checkPermissions(ITEM_MANAGER_ROLE) {
        require(itemsMap.idSet.contains(id), "This item does not exist.");
        require(
            itemsMap.itemsList[id].totalSupply == balanceOf(msg.sender, id),
            "You must own the entire supply of this asset to delete it."
        );

        delete itemsMap.itemsList[id];
        
        itemsMap.idSet.remove(id);
        emit ItemRemoved(id);
    }
    
    // check if the item exists
    function exists(uint256 id) public view returns (bool) {
        return itemsMap.idSet.contains(id);
    }

    // Get Length of the item list
    function length() public view returns (uint256)
    {
        return itemsMap.idSet.length();
    }

    // Returns an array of IDs
    function getAllItems() public view returns(uint256[] memory) {
        uint256 len = itemsMap.idSet.length();
        require(len != 0, "The list is empty.");

        uint256[] memory idList = new uint[](len);
        for (uint256 index = 0; index < len; index++)
        {
            idList[index] = itemsMap.idSet.at(index);
        }

        return idList;
    }

    function getTotalSupply(uint256 id) public view returns(uint256) {
        require(itemsMap.idSet.contains(id), "This item does not exist.");
        return itemsMap.itemsList[id].totalSupply;
    }

    function getCreatorAddress(uint256 id) public view returns(address) {
        require(itemsMap.idSet.contains(id), "This item does not exist.");
        return itemsMap.itemsList[id].creatorAddress;
    }

    function mint(address receivingAddress, uint256 itemId, uint256 amount)
        public
        checkPermissions(MINTER_ROLE)
    {
        require(itemsMap.idSet.contains(itemId), "Item does not exist.");
        require(receivingAddress != address(0), "Cannot send to null adderss.");
        require(
            !itemsMap.itemsList[itemId].isSupplyCapped,
            "Supply cannot be increased."
        );

        itemsMap.itemsList[itemId].totalSupply += amount;
        _mint(receivingAddress, itemId, amount, "");
        emit ItemMinted(itemId, amount);
    }

    function mintBatch(
        address receivingAddress,
        uint256[] memory itemIds,
        uint256[] memory amounts
    )
        public 
        checkPermissions(MINTER_ROLE)
    {
        require(itemIds.length == amounts.length, "item arrays don't match.");
        require(receivingAddress != address(0), "Cannot send to null adderss.");

        for (uint i = 0; i < itemIds.length; i++)
        {
            require(itemsMap.idSet.contains(itemIds[i]), "Item does not exist.");
            require(
                !itemsMap.itemsList[i].isSupplyCapped,
                "Supply cannot be increased."
            );

            itemsMap.itemsList[itemIds[i]].totalSupply += amounts[i];

            // Future: maybe I don't actually need this. Add this for now, 
            // remove later if not needed.
            emit ItemMinted(itemIds[i], amounts[i]);
        }
        _mintBatch(receivingAddress, itemIds, amounts, "");
    }

    function burn(address account, uint256 itemId, uint256 amount)
        public
        checkPermissions(BURNER_ROLE)
    {
        require(itemsMap.idSet.contains(itemId), "Item does not exist.");
        require(account != address(0), "Cannot send to null adderss.");

        // _burn requirements are that account is non-zero and account has 
        // enough of these items
        _burn(account, itemId, amount);

        // if _burn succeeds, then we know that totalSupply can be deducted.
        itemsMap.itemsList[itemId].totalSupply -= amount;
        emit ItemBurned(itemId, amount);
    }

    function burnBatch(
        address account,
        uint256[] memory itemIds,
        uint256[] memory amounts
    )
        public
        checkPermissions(BURNER_ROLE)
    {
        require(itemIds.length == amounts.length, "item arrays don't match.");
        require(account != address(0), "Cannot send to null adderss.");

        // _burnBatch requirements are that account is non-zero and account 
        // has enough of these items
        _burnBatch(account, itemIds, amounts);

        // if _burnBatch succeeds, then we know that totalSupply can be 
        // deducted.
        for (uint i = 0; i < itemIds.length; i++)
        {
            require(
                itemsMap.idSet.contains(itemIds[i]),
                "Item does not exist."
            );
            itemsMap.itemsList[itemIds[i]].totalSupply -= amounts[i];
            emit ItemBurned(itemIds[i], amounts[i]);
        }
    }

    /******** Internal Functions ********/
    function _createItem(
        uint256 id,
        address payable creatorAddress,
        uint256 maxSupply
    )
        public
        checkPermissions(ITEM_MANAGER_ROLE)
    {
        require(itemsMap.idSet.add(id), "This item already exists.");

        Item storage item = itemsMap.itemsList[id];
        item.uuid = id;
        item.isSupplyCapped = (maxSupply != 0);
        item.totalSupply = (maxSupply != 0) ? maxSupply : 0;
        item.creatorAddress = (creatorAddress == address(0))
            ? gamePayableAddress: creatorAddress;

        emit ItemCreated(id);
    }
}