// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IItemInfoStorage.sol";

contract ItemInfoStorage is IItemInfoStorage, Ownable {
    using EnumerableSet for EnumerableSet.UintSet;

    /******** Data Structures ********/
    struct Item {
        address payable creatorAddress;
        uint256 maxSupply;
    }

    /******** Stored Variables ********/
    EnumerableSet.UintSet idSet;
    mapping(uint256 => Item) items;

    // view
    function contains(uint256 _id) external view override returns (bool) {
        return idSet.contains(_id);
    }

    function length() external view override returns(uint256) {
        return idSet.length();
    }

    function listItems() external view override returns(uint256[] memory) {
        uint256[] memory idList = new uint[](idSet.length());
        for (uint256 i = 0; i < idSet.length(); i++) {
            idList[i] = idSet.at(i);
        }

        return idList;
    }

    function getItemInfo(uint256 _id) external view override returns(address, uint256)  {
        // Todo: figure out if this returns address(0) if it doesn't exist
        return (items[_id].creatorAddress, items[_id].maxSupply);
    }

    // Mutative    
    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external override onlyOwner {
        idSet.add(_id);
        Item storage item = items[_id];
        item.creatorAddress = _creatorAddress;
        item.maxSupply = _maxSupply;
    }
    
    function createItemBatch(
        address payable _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    ) 
        external override onlyOwner
    {
        require(_ids.length == _maxSupplies.length, "Parameter array size incorrect");
        for (uint i = 0; i < _ids.length; ++i) {
            idSet.add(_ids[i]);
            Item storage item = items[_ids[i]];
            item.creatorAddress = _creatorAddress;
            item.maxSupply = _maxSupplies[i];
        }
    }
}