// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGame {
    /******** View Functions ********/ 
    function getGameManagerAddress() external view returns(address);
    
    function contains(uint256 _id) external view returns (bool);

    function containsAll(uint256[] calldata _ids) external view returns(bool);

    function length() external view returns (uint256);

    function listItems(uint256 offset) external view returns(uint256[] memory, uint256);

    function getItemInfo(uint256 _id) external view returns(address, uint256);
    
    function getItemInfoBatch(uint256[] calldata _ids) external view returns(address[] memory addrs, uint256[] memory supplies);

    /******** Mutative Functions ********/
    function setGameManagerAddress(address payable _newAddress) external;

    function createItem(address payable _creatorAddress, uint256 _id, uint256 _maxSupply) external;
    
    function createItemBatch(
        address payable creatorAddress,
        uint256[] calldata ids,
        uint256[] calldata maxSupplies
    ) external;

    function setUri(string calldata _newUri) external;

    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount) external;

    function mintBatch(address _receivingAddress, uint256[] calldata _itemIds, uint256[] calldata _amounts) external;

    function burn(address _account, uint256 _itemId, uint256 _amount) external;

    function burnBatch(address _account, uint256[] calldata _itemIds, uint256[] calldata _amounts) external;
}