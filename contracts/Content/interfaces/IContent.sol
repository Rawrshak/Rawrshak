// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContent {
    
    function setContractUri(string memory _contractUri) external;
    
    function tokenUri(uint256 _tokenId) external view returns (string memory);
    
    function tokenUri(uint256 _tokenId, uint256 _version) external view returns (string memory);
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory);

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}