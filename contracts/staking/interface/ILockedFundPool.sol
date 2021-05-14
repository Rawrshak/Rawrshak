// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ILockedFundPool {

    /******** View Functions ********/
    function lockedSupply() external view returns(uint256);

    /******** Mutative Functions ********/
    function reloadFunds(uint256 _amount) external;

    function releaseFunds(uint256 _stakedTokensAmount) external;

    /*********************** Events *********************/
    event FundsReleased(uint256 amount, uint256 lockedFundsLeft);
    event FundsReloaded(uint256 amount, uint256 rewardPoolSupply);
}