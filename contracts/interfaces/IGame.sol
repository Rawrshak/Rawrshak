// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGame {
    // view
    function getGamePayableAddress() external view returns(address payable);
    
    function contains(uint256 id) external view returns (bool);

    function length() external view returns (uint256);

    function getAllItems() external view returns(uint256[] memory);

    function getTotalSupply(uint256 id) external view returns(uint256);

    function getMaxSupply(uint256 id) external view returns(uint256);

    function getCreatorAddress(uint256 id) external view returns(address);

    // Mutative
    function setGamePayableAddress(address payable newAddress) external;
    
    function createItem(address _creatorAddress, uint256 _id, uint256 _maxSupply) external;

    function createItemBatch(
        address _creatorAddress,
        uint256[] calldata _ids,
        uint256[] calldata _maxSupplies
    ) external;

    function mint(address receivingAddress, uint256 itemId, uint256 amount) external;

    function mintBatch(address receivingAddress, uint256[] calldata itemIds, uint256[] calldata amounts)
        external;

    function burn(address account, uint256 itemId, uint256 amount) external;

    function burnBatch(address account, uint256[] calldata itemIds, uint256[] calldata amounts) external;
}