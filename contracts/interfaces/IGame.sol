// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./IGameInterface.sol";

interface IGame is IGameInterface {
    /******** View Functions ********/ 
    function getGameManagerAddress() external view returns(address);
    
    function contains(uint256 _id) external view returns (bool);

    function length() external view returns (uint256);

    function getItemInfo(uint256 _id) external view returns(address, uint256);

    /******** Mutative Functions ********/
    function setGameManagerAddress(address _newAddress) external;
}