// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IContractUri {
    /******** View Functions ********/
    function contractUri() external view returns (string memory);
}