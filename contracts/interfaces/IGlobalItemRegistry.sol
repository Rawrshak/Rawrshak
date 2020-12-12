// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGlobalItemRegistry {
    /******** View Functions ********/
    function getUUID(address _gameAddr, uint256 _id) external pure returns(uint256);
    
    function getItemInfo(uint256 _uuid) external view returns(address, address, uint256);
    
    function contains(uint256 _id) external view returns (bool);

    function length() external view returns (uint256);

    /******** Mutative Functions ********/
    function add(uint256 _id) external;
    
    function addBatch(uint256[] calldata _ids) external;
}