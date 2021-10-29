// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibLootbox.sol";

interface ILootbox is IERC1155Upgradeable {
    /******** View Functions ********/

    /******** Mutative Functions ********/
    function registerStorage(address _storage) external;

    function managerSetPause(bool _setPause) external;

    function mint(uint256 _tokenId, uint256 _amount) external;

    function burn(uint256 _tokenId) external;

    /*function setClassForTokenId(uint256 _tokenId, uint256 _class) external;

    function setTokenIdsForClass(uint256 _class, uint256[] memory _tokenIds) external;

    function resetClass(uint256 _class) external;*/

    //function open(uint256 _optionId, address _toAddress, uint256 _amount) external;
    
    /*********************** Events *********************/
    event StorageRegistered(address indexed operator, address indexed storageAddress);
    event LootboxCreated(address indexed operator, uint256 indexed tokenId, uint256 indexed amount);
    event LootboxOpened(address indexed operator, uint256 indexed tokenId, uint256 indexed numAssetsGiven);
}