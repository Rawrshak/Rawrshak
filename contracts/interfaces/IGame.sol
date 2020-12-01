// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./IGameInterface.sol";

interface IGame is IGameInterface {
    /******** View Functions ********/ 
    function getGameManagerAddress() external view returns(address);
    
    function contains(uint256 _id) external view returns (bool);

    function containsAll(uint256[] calldata _ids) external view returns(bool);

    function length() external view returns (uint256);

    function listItems(uint256 offset) external view returns(uint256[] memory, uint256);

    function getItemInfo(uint256 _id) external view returns(address, uint256);
    
    function getItemInfoBatch(uint256[] calldata _ids) external view returns(address[] memory addrs, uint256[] memory supplies);

    /******** Mutative Functions ********/
    function setGameManagerAddress(address _newAddress) external;
}