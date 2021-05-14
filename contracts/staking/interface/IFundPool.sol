// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "./IClaimable.sol";

interface IFundPool is IClaimable {

    /******** Mutative Functions ********/
    function receiveFunds(uint256 _amount) external;
    
    function registerManager(address _manager) external;

    /*********************** Events *********************/
    event FundsReceived(uint256 amount, uint256 rewardPoolSupply);
    event ManagerRegistered(address manager);
}