// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IGameInterface {  
    /******** Mutative Functions ********/
    function setGlobalItemRegistryAddr(address _addr) external;
    
    function setUri(string calldata _newUri) external;

    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external;
    
    function createItemBatch(
        address payable creatorAddress,
        uint256[] calldata ids,
        uint256[] calldata maxSupplies
    ) external;

    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount) external;

    function mintBatch(address _receivingAddress, uint256[] calldata _itemIds, uint256[] calldata _amounts) external;

    function burn(address _account, uint256 _itemId, uint256 _amount) external;

    function burnBatch(address _account, uint256[] calldata _itemIds, uint256[] calldata _amounts) external;
}