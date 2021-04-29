// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibRoyalties.sol";
import "../../libraries/LibAsset.sol";

interface IContent {

    function approveAllSystems(bool _approve) external;
    
    function getSupplyInfo(uint256 _tokenId) external view returns (uint256 supply, uint256 maxSupply);

    function tokenUri(uint256 _tokenId) external view returns (string memory);
    
    function tokenDataUri(uint256 _tokenId) external view returns (string memory);
    
    function tokenDataUri(uint256 _tokenId, uint256 _version) external view returns (string memory);
    
    function isSystemOperatorApproved(address _operator) external view returns (bool);
    
    function isOperatorRegistered(address _operator) external view returns (bool);

    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory);

    // function addAssetBatch(LibAsset.CreateData[] memory _assets) external;

    function mintBatch(LibAsset.MintData memory _data) external;

    function burnBatch(LibAsset.BurnData memory _data) external;
}