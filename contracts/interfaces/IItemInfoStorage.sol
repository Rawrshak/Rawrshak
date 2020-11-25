// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IItemInfoStorage {
    // view
    function contains(uint256 _id) external view returns (bool);

    function length() external view returns (uint256);

    function listItems() external view returns(uint256[] memory);

    function getItemInfo(uint256 _id) external view returns(address, uint256) ;

    // Mutative
    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external;
    
    function createItemBatch(
        address payable creatorAddress,
        uint256[] calldata ids,
        uint256[] calldata maxSupplies
    ) external;
}