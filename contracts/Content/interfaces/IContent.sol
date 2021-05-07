// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContent is IERC1155Upgradeable {

    function approveAllSystems(bool _approve) external;
    
    function getSupplyInfo(uint256 _tokenId) external view returns (uint256 supply, uint256 maxSupply);

    function tokenUri(uint256 _tokenId) external view returns (string memory);
    
    function hiddenTokenUri(uint256 _tokenId) external view returns (string memory);
    
    function hiddenTokenUri(uint256 _tokenId, uint256 _version) external view returns (string memory);

    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory);

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}