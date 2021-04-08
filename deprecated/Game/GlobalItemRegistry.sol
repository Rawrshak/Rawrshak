// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Storage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../interfaces/IGame.sol";
import "../../utils/Constants.sol";

// Todo: Restrict item add permissions

contract GlobalItemRegistry is IGlobalItemRegistry, ERC165Storage {
    using Address for address;
    using EnumerableSet for EnumerableSet.UintSet;
    using ERC165Checker for *;

    /******** Constants ********/
    /*
     *     bytes4(keccak256('getUUID(address,uint256)')) == 0x5c26f843
     *     bytes4(keccak256('getItemInfo(uint256)')) == 0xde7fe3e7
     *     bytes4(keccak256('contains(uint256)')) == 0xc34052e0
     *     bytes4(keccak256('length()')) == 0x1f7b6d32
     *     bytes4(keccak256('add(uint256)')) == 0x1003e2d2
     *     bytes4(keccak256('addBatch(uint256[])')) == 0x56634921
     *
     *     => 0x5c26f843 ^ 0xde7fe3e7 ^ 0xc34052e0 ^ 0x1f7b6d32
     *      ^ 0x1003e2d2 ^ 0x56634921 == 0x18028f85
     */

    /******** Data Structures ********/
    struct Item {
        address gameAddress;
        uint256 gameId;
    }
    
    /******** Stored Variables ********/
    EnumerableSet.UintSet itemIds;
    mapping(uint256 => Item) itemRegistry;
    
    /******** Events ********/
    event ItemRegistered(address gameAddress, uint256 gameId, uint256 uuid);
    event ItemBatchRegistered(address gameAddress, uint256[] gameIds, uint256[] uuids);

    /******** Modifiers ********/
    modifier isCallerGame() {
        require(
            ERC165Checker.supportsInterface(msg.sender, Constants._INTERFACE_ID_IGAME),
            "Caller does not support Interface."
        );
        _;
    }

    /******** Public API ********/
    constructor() {
        _registerInterface(Constants._INTERFACE_ID_IGLOBALITEMREGISTRY);
    }

    function getUUID(address _gameAddr, uint256 _id)
        external
        pure
        override
        returns(uint256)
    {
        return _getId(_gameAddr, _id);
    }
    
    function getItemInfo(uint256 _uuid) external view override returns(address, address, uint256) {
        return (
            itemRegistry[_uuid].gameAddress,
            IGame(itemRegistry[_uuid].gameAddress).getManagerAddress(),
            itemRegistry[_uuid].gameId);
    }
    
    function contains(uint256 _uuid) external view override returns (bool) {
        return itemIds.contains(_uuid);
    }

    function length() external view override returns (uint256) {
        return itemIds.length();
    }

    // Mutative
    function add(uint256 _id) external override isCallerGame() {        
        uint256 uuid = _getId(msg.sender, _id);
        
        // check to see if item was previously added
        require(itemIds.add(uuid), "Item already exists.");

        itemRegistry[uuid].gameAddress = msg.sender;
        itemRegistry[uuid].gameId = _id;
        emit ItemRegistered(msg.sender, _id, uuid);
    }
    
    function addBatch(uint256[] calldata _ids) external override isCallerGame() {
        uint256[] memory uuids = new uint256[](_ids.length);
        for (uint256 i = 0; i < _ids.length; ++i) {
            uuids[i] = _getId(msg.sender, _ids[i]);
            
            // check to see if item was previously added
            require(itemIds.add(uuids[i]), "Item already exists.");

            itemRegistry[uuids[i]].gameAddress = msg.sender;
            itemRegistry[uuids[i]].gameId = _ids[i];
        }
        emit ItemBatchRegistered(msg.sender, _ids, uuids);
    }

    // internal
    function _getId(address _contractAddress, uint256 _id) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_contractAddress, _id)));
    }
}