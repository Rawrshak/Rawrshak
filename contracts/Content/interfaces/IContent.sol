// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibRoyalties.sol";
import "./IRoyaltyProvider.sol";
import "../../libraries/LibAsset.sol";

interface IContent is IRoyaltyProvider, IERC1155Upgradeable {
    
    /******** View Functions ********/
    function supply(uint256 _tokenId) external view returns (uint256);
    
    function maxSupply(uint256 _tokenId) external view returns (uint256);

    function tokenUri(uint256 _tokenId) external view returns (string memory);
    
    function hiddenTokenUri(uint256 _tokenId) external view returns (string memory);
    
    function hiddenTokenUri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    /******** Mutative Functions ********/
    function approveAllSystems(bool _approve) external;

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}