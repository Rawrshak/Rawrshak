// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "./ILootboxBase.sol";

interface ILootboxManager is ILootboxBase {
    /******** View Functions ********/
    function getLootboxAddress() external view returns(address);
    
    /******** Mutative Functions ********/
    function generateLootboxContract(address _lootboxFactoryAddress, string calldata _url) external;
}