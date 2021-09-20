// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibStaking.sol";

interface IStaking {

    /******** View Functions ********/

    function token() external view returns(address);

    function totalStakedTokens() external view returns(uint256);

    function userStakedAmount(address) external view returns(uint256);

    function getUserClaimableExchangeRewards(address _user) external view returns(LibStaking.Reward[] memory rewards);
    
    function getUserClaimableStakingRewards(address _user) external view returns(LibStaking.Reward[] memory rewards);

    /******** Mutative Functions ********/
    function stake(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function exit() external;

    function claimRewards() external;

    /*********************** Events *********************/
    event Staked(address indexed sender, uint256 amount, uint256 totalStakedAmount);
    event Withdraw(address indexed sender, uint256 amount, uint256 remainingStakedAmount);
}