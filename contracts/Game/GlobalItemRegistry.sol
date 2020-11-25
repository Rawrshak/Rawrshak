// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
// import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IGlobalItemRegistry.sol";

contract GlobalItemRegistry is IGlobalItemRegistry {
    using Address for address;
    using EnumerableSet for EnumerableSet.UintSet;

    /******** Data Structures ********/
    struct Item {
        address gameAddress;
        uint256 gameId;
    }
    
    /******** Stored Variables ********/
    EnumerableSet.UintSet itemIds;
    mapping(uint256 => Item) itemRegistry;
    
    /******** Events ********/
    event AddedItem(address gameAddress, uint256 gameId, uint256 uuid);
    event AddedItemBatch(address gameAddress, uint256[] gameIds, uint256[] uuids);

    /******** Modifiers ********/
    // Todo: check if it's a game contract making the call
    // modifier isCallerGame(bytes32 role) {
    //     require(hasRole(role, msg.sender), "Caller missing permissions");
    //     _;
    // }

    // constructor() public {
    //     _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    //     _setupRole(MANAGER_ROLE, msg.sender);
    // }

    function getUUID(address _gameAddr, uint256 _id)
        external
        view
        override
        returns(uint256)
    {
        require(Address.isContract(_gameAddr), "Address is not valid");
        return _getId(_gameAddr, _id);
    }
    
    function getItemInfo(uint256 _uuid) external view override returns(address, uint256) {
        return (itemRegistry[_uuid].gameAddress, itemRegistry[_uuid].gameId);
    }
    
    function contains(uint256 _uuid) external view override returns (bool) {
        return itemIds.contains(_uuid);
    }

    function length() external view override returns (uint256) {
        return itemIds.length();
    }

    // Mutative
    function add(uint256 _id) external override {
        // Todo: add isCallerGame()
        uint256 uuid = _getId(msg.sender, _id);
        
        // check to see if item was previously added
        require(itemIds.add(uuid), "Item already exists.");

        itemRegistry[uuid].gameAddress = msg.sender;
        itemRegistry[uuid].gameId = _id;
        emit AddedItem(msg.sender, _id, uuid);
    }
    
    function addBatch(uint256[] calldata _ids) external override {
        // Todo: add isCallerGame()
        uint256[] memory uuids = new uint256[](_ids.length);
        for (uint256 i = 0; i < _ids.length; ++i) {
            uuids[i] = _getId(msg.sender, _ids[i]);
            
            // check to see if item was previously added
            require(itemIds.add(uuids[i]), "Item already exists.");

            itemRegistry[uuids[i]].gameAddress = msg.sender;
            itemRegistry[uuids[i]].gameId = _ids[i];
        }
        emit AddedItemBatch(msg.sender, _ids, uuids);
    }

    // internal
    function _getId(address _contractAddress, uint256 _id) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_contractAddress, _id)));
    }
}