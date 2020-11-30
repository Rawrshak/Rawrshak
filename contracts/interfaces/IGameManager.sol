// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGameManager {
    /******** View Functions ********/
    function getGameAddress() external view returns(address);

    /******** Mutative Functions ********/    
    function setUri(string calldata _newUri) external;

    function createItem(address _creatorAddress, uint256 _id, uint256 _maxSupply) external;

    function createItemBatch(
        address _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    ) external;

    function mint(address _receivingAddress, uint256 _itemId, uint256 _amount) external;

    function mintBatch(
        address _receivingAddress,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    ) external;

    function burn(address _account, uint256 _itemId, uint256 _amount) external;

    function burnBatch(
        address _account,
        uint256[] calldata _itemIds,
        uint256[] calldata _amounts
    ) external;
}