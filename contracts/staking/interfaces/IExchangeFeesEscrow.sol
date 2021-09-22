// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibStaking.sol";

interface IExchangeFeesEscrow { 

    /******** View Functions ********/
    function rate() external view returns(uint24);
    
    function totalFees(address _token) external view returns(uint256);

    function getClaimableRewards(address _user) external view returns(LibStaking.Reward[] memory claimableRewards);

    function hasExchangeFees() external view returns(bool);
    
    /******** Mutative Functions ********/
    function setRate(uint24 _rate) external;

    function depositFees(address _token, uint256 _amount) external;

    function initializeTokenRate() external;

    function updateUserRewards(address _user) external;

    function claimRewards(address _user) external returns(LibStaking.Reward[] memory claimedRewards);
    
    /*********************** Events *********************/
    event FeeUpdated(address indexed operator, uint24 rate);
    event ExchangeFeesPaid(address indexed tokenAddr, uint256 amount);
}
