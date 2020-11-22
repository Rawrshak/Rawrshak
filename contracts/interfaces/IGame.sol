// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface IGame {
    function getGamePayableAddress() external view  returns(address payable);
}