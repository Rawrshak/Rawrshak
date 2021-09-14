// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILockedFundPool {

    /******** View Functions ********/
    function lockedSupply() external view returns(uint256);

    /******** Mutative Functions ********/
    function reloadFunds(uint256 _amount) external;

    function releaseFunds(uint256 _stakedTokensAmount) external;

    /*********************** Events *********************/
    event FundsReloaded(address indexed from, uint256 amount, uint256 rewardPoolSupply);
}