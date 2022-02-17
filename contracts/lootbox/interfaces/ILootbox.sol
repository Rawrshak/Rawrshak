// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibLootbox.sol";

interface ILootbox is IERC1155Upgradeable {
    /******** View Functions ********/

    /******** Mutative Functions ********/
    function registerStorage(address _storage) external;

    function managerSetPause(bool _setPause) external;

    function mint(uint256 _tokenId, uint256 _amount) external;

    function burn(uint256 _tokenId) external;
    
    /*********************** Events *********************/
    event StorageRegistered(address indexed operator, address indexed storageAddress);
    event LootboxCreated(address indexed operator, uint256 indexed tokenId, uint256 indexed amount);
    event LootboxOpened(address indexed operator, uint256 indexed tokenId, uint256 indexed numAssetsGiven);
}