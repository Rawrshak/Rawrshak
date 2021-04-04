// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./IGameInterface.sol";
import "./IDatabaseContract.sol";

interface IGame is IGameInterface, IDatabaseContract {
    /******** View Functions ********/ 
    
    function contains(uint256 _id) external view returns (bool);

    function length() external view returns (uint256);

    function getItemInfo(uint256 _id) external view returns(address, uint256);

    /******** Mutative Functions ********/
}