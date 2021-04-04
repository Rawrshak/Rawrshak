// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IDatabaseContract {
    /******** View Functions ********/
    function getManagerAddress() external view returns(address);

    /******** Mutative Functions ********/
    function setManagerAddress(address _newAddress) external;
}