// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IClaimable.sol";

interface IFundPool is IClaimable {

    /******** Mutative Functions ********/
    function receiveFunds(uint256 _amount) external;
    
    function registerManager(address _manager) external;

    /*********************** Events *********************/
    event FundsReceived(address indexed from, uint256 amount, uint256 rewardPoolSupply);
    event ManagerRegistered(address manager);
}