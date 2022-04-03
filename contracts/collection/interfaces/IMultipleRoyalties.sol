// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMultipleRoyalties {
    /******** View Functions ********/
    function multipleRoyaltyInfo(uint256 _paTokenId, uint256 _saleprice) external view returns(address[] memory, uint256[] memory);
}