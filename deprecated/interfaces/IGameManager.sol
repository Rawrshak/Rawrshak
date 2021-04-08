// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./IGameInterface.sol";

interface IGameManager is IGameInterface {
    function generateGameContract(address _gameFactoryAddress, string calldata _url) external;
}