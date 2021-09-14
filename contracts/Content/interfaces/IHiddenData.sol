// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHiddenData {
    function hiddenUri(uint256 _tokenId) external view returns (string memory);
    
    function hiddenUri(uint256 _tokenId, uint256 _version) external view returns (string memory);
}