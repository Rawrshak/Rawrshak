// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGlobalItemRegistry {
    // view
    function getUUID(address gameAddr, uint256 id) external view returns(uint256);
    
    function getItemInfo(uint256 uudid) external view returns(address, uint256);
    
    function contains(uint256 id) external view returns (bool);

    function length() external view returns (uint256);

    // Mutative
    function add(uint256 id) external;
    
    function addBatch(uint256[] calldata id) external;
}