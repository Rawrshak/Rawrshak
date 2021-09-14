// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "./IRoyaltyProvider.sol";
import "../../libraries/LibAsset.sol";
import "./IContractUri.sol";

interface IUniqueContent is IContractUri, IERC721Upgradeable, IRoyaltyProvider {

    /******** View Functions ********/
    function creator() external view returns(address);

    function contentContract() external view returns(address);
    
    function id() external view returns(uint256);

    function hiddenUri(uint256) external view returns (string memory);

    /******** Mutative Functions ********/
    function mint(address to) external;

    function burn(address to) external;
    
    /*********************** Events *********************/
    event UniqueContentCreated(address indexed from, string indexed name, string indexed symbol, LibAsset.UniqueContentData mintData);
}