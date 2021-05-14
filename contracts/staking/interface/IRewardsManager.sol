// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface IRewardsManager {
    
    /******** Mutative Functions ********/
    function nextStakingInterval() external;

    function reloadStaking(uint256 _amount) external;

    function distributeExchangeFees() external;
}