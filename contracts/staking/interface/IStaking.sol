// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStaking {

    /******** View Functions ********/
    function getStakePercentage() external view returns(uint256);

    function token() external view returns(address);

    function totalStakedTokens() external view returns(uint256);

    function stakedAmounts(address) external view returns(uint256);

    function totalClaimableTokensInInterval() external view returns(uint256);

    function unclaimedTokensInInterval() external view returns(uint256);

    /******** Mutative Functions ********/
    function deposit(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function claim() external;

    /*********************** Events *********************/
    event Deposit(address indexed sender, uint256 amount, uint256 totalStaked);
    event Withdraw(address indexed sender, uint256 amount, uint256 remainingStaked);
}