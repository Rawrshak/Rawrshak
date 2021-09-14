// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRewardsManager {

    function stakingInterval() external view returns(uint256);
    
    /******** Mutative Functions ********/
    function nextStakingInterval() external;

    function reloadStaking(uint256 _amount) external;

    function distributeExchangeFees() external;
}