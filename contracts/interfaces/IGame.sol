// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGame {
    function getGamePayableAddress() external view returns(address payable);
    function setGamePayableAddress(address payable newAddress) external;
    
    function createItem(uint256 id) external;
    function createItem(uint256 id, address creatorAddress) external;
    function createItem(uint256 id,address creatorAddress,uint256 maxSupply) external;
    function createItemBatch(uint256[] calldata ids) external;
    function createItemBatch(uint256[] calldata ids, address creatorAddress) external;
    function createItemBatch(uint256[] calldata ids,address creatorAddress,uint256[] calldata maxSupplies) external;
    
    function deleteItem(uint256 id) external;
    function exists(uint256 id) external view returns (bool);
    function length() external view returns (uint256);
    function getAllItems() external view returns(uint256[] memory);
    function getTotalSupply(uint256 id) external view returns(uint256);
    function getCreatorAddress(uint256 id) external view returns(address);
    function mint(address receivingAddress, uint256 itemId, uint256 amount) external;
    function mintBatch(address receivingAddress, uint256[] calldata itemIds, uint256[] calldata amounts)
        external;
    function burn(address account, uint256 itemId, uint256 amount) external;
    function burnBatch(address account, uint256[] calldata itemIds, uint256[] calldata amounts) external;
}