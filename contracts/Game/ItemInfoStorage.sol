// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "../interfaces/IItemInfoStorage.sol";

contract ItemInfoStorage is IItemInfoStorage, Ownable, ERC165 {
    using EnumerableSet for EnumerableSet.UintSet;

    /******** Constants ********/
    /*
     *     bytes4(keccak256('contains(uint256)')) == 0xc34052e0
     *     bytes4(keccak256('length()')) == 0x1f7b6d32
     *     bytes4(keccak256('listItems()')) == 0x355eefc8
     *     bytes4(keccak256('getItemInfo(uint256)')) == 0xde7fe3e7
     *     bytes4(keccak256('createItem(address,uint256,uint256)')) == 0x57baf0fb
     *     bytes4(keccak256('createItemBatch(address,uint256[],uint256[])')) == 0x00ff4688
     *
     *     => 0xc34052e0 ^ 0x1f7b6d32 ^ 0x355eefc8 ^ 0xde7fe3e7
     *      ^ 0x57baf0fb ^ 0x00ff4688 == 0x605f858e
     */
    bytes4 private constant _INTERFACE_ID_IITEMINFOSTORAGE = 0x605f858e;

    /******** Data Structures ********/
    struct Item {
        address payable creatorAddress;
        uint256 maxSupply;
    }

    /******** Stored Variables ********/
    EnumerableSet.UintSet idSet;
    mapping(uint256 => Item) items;

    /******** Public API ********/
    constructor() public {
        _registerInterface(_INTERFACE_ID_IITEMINFOSTORAGE);
    }

    /******** View Functions ********/
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
        return (items[_id].creatorAddress, items[_id].maxSupply);
    }

    /******** Mutative Functions ********/   
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