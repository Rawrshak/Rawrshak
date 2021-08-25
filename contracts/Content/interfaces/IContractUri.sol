// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IContractUri {
    /******** View Functions ********/
    function contractUri() external view returns (string memory);
}