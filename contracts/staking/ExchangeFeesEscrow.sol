// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../exchange/EscrowBase.sol";
import "../resolver/IAddressResolver.sol";
import "./interfaces/IExchangeFeesEscrow.sol";
import "./interfaces/IStaking.sol";
import "../utils/EnumerableMapsExtension.sol";
import "../libraries/LibStaking.sol";
import "../utils/LibContractHash.sol";

contract ExchangeFeesEscrow is IExchangeFeesEscrow, EscrowBase {
    using EnumerableMapsExtension for *;

    /***************** Stored Variables *****************/
    // rewards[token] = rewardAmount
    EnumerableMapsExtension.AddressToUintMap rewards;
    // rewardRate[token] = rate
    EnumerableMapsExtension.AddressToUintMap rewardRate;
    // userRewardRate[user][token] = userRate
    mapping(address => EnumerableMapsExtension.AddressToUintMap) userRewardRate;
    // userAccumulatedRewards[user][token] = userRewards
    mapping(address => EnumerableMapsExtension.AddressToUintMap) userAccumulatedRewards;

    IAddressResolver resolver;
    uint24 public override rate;

    /******************** Public API ********************/
    function __ExchangeFeesEscrow_init(uint24 _rate) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __EscrowBase_init_unchained();
        __ExchangeFeesEscrow_init_unchained(_rate);
    }

    function __ExchangeFeesEscrow_init_unchained(uint24 _rate) internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_EXCHANGE_FEES_ESCROW);
        _setRate(_rate);
        grantRole(MANAGER_ROLE, _msgSender());
    }
 
    function setRate(uint24 _rate) public override onlyRole(MANAGER_ROLE) {
        _setRate(_rate);
        emit FeeUpdated(_msgSender(), rate);
    }

    function depositFees(address _token, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // Increase Rewards 
        if (!rewards.contains(_token)) {
            rewards.set(_token, _amount);

            // Initialize rewardRate for that token
            rewardRate.set(_token, 0);
        } else {
            rewards.set(_token, rewards.get(_token) + _amount);
        }

        // Update reward rate
        if (_staking().totalStakedTokens() > 0) {
            rewardRate.set(_token, rewardRate.get(_token) + (_amount / _staking().totalStakedTokens()));
        }

        emit ExchangeFeesPaid(_token, _amount);
    }

    function initializeTokenRate() external override onlyRole(MANAGER_ROLE) {
        // Only call when the first person stakes
        address token;
        uint256 totalRewards;

        // Set the reward rate for each token
        for (uint256 i = 0; i < rewards.length(); i++) {
            (token, totalRewards) = rewards.at(i);
            rewardRate.set(token, totalRewards * 10**18 / _staking().totalStakedTokens());
        }
    }

    function updateUserRewards(address _user) external override onlyRole(MANAGER_ROLE) {
        // This is called when user claims, decreases stake, and increases stake
        require(_staking().totalStakedTokens() > 0, "No staked amount");
        address token;
        uint256 totalRewardRate;
        // Set the reward rate for each token
        for (uint256 i = 0; i < rewardRate.length(); i++) {
            (token, totalRewardRate) = rewardRate.at(i);
            
            // First Rewards for user
            if (!userRewardRate[_user].contains(token)) {
                userRewardRate[_user].set(token, 0);
                userAccumulatedRewards[_user].set(token, 0);
            }

            uint256 userRate = userAccumulatedRewards[_user].get(token) + ((totalRewardRate - userRewardRate[_user].get(token)) * _staking().userStakedAmount(_user) / 10**18);

            userAccumulatedRewards[_user].set(token, userRate);
            userRewardRate[_user].set(token, totalRewardRate);
        }
    }

    function claimRewards(address _user) external override onlyRole(MANAGER_ROLE) returns(LibStaking.Reward[] memory claimedRewards) {
        require(rewards.length() > 0, "Nothing to claim");
        address token;
        uint256 accumulatedReward;

        claimedRewards = new LibStaking.Reward[](userAccumulatedRewards[_user].length());
        for (uint256 i = 0; i < userAccumulatedRewards[_user].length(); ++i) {
            (token, accumulatedReward) = userAccumulatedRewards[_user].at(i);

            claimedRewards[i].token = token;
            claimedRewards[i].amount = accumulatedReward;

            if (accumulatedReward > 0) {
                userAccumulatedRewards[_user].set(token, 0);
                rewards.set(token, rewards.get(token) - accumulatedReward);

                IERC20Upgradeable(token).transfer(_user, accumulatedReward);
            }
        }
    }

    // gets the amount in the fee pool
    function totalFees(address _token) external view override returns(uint256) {
        if (!rewards.contains(_token)) {
            return 0;
        }
        return rewards.get(_token);
    }

    function getClaimableRewards(address _user) external view override onlyRole(MANAGER_ROLE) returns(LibStaking.Reward[] memory claimableRewards) {
        address token;
        uint256 accumulatedReward;
        claimableRewards = new LibStaking.Reward[](userAccumulatedRewards[_user].length());
        for (uint256 i = 0; i < userAccumulatedRewards[_user].length(); ++i) {
            (token, accumulatedReward) = userAccumulatedRewards[_user].at(i);

            accumulatedReward += (rewardRate.get(token) - userRewardRate[_user].get(token)) * _staking().userStakedAmount(_user) / 10**18;

            claimableRewards[i].token = token;
            claimableRewards[i].amount = accumulatedReward;
        }
    }

    function _setRate(uint24 _rate) internal {
        require(_rate > 0 && _rate <= 1e6, "Invalid rate");
        rate = _rate;
    }
    
    /**************** Internal Functions ****************/
    function _staking() internal view returns(IStaking) {
        return IStaking(resolver.getAddress(LibContractHash.CONTRACT_STAKING));
    }

    uint256[50] private __gap;
}