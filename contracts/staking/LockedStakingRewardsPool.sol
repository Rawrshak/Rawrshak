// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./StakingRewardsPool.sol";
import "./interface/ILockedFundPool.sol";
import "./LockedFundBase.sol";

contract LockedStakingRewardsPool is LockedFundBase {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    
    /***************** Stored Variables *****************/
    uint256 public emissionRate;    // (1.2^(1/52))-1 at the start
    uint256 public emissionRateSlowdown; // (1.2-1.02)/260 
    uint256 public intervalsBeforeEmissionRateStabilization;    // 260 - 5 years (260 weeks)

    /*********************** Events *********************/
    event FundsReleased(uint256 amount, uint256 lockedFundsLeft, uint256 newEmissionsRate, uint256 intervalsLeft);
    
    /******************** Public API ********************/
    function __LockedStakingRewardsPool_init(
        address _token,
        address _rewardsPool,
        uint256 _lockedSupply,
        uint256 _emissionRate,
        uint256 _emissionRateSlowdown,
        uint256 _intervalsBeforeEmissionRateStabilization
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        __LockedFundBase_init_unchained(_token, _rewardsPool);

        lockedSupply = _lockedSupply;
        emissionRate = _emissionRate;
        emissionRateSlowdown = _emissionRateSlowdown;
        intervalsBeforeEmissionRateStabilization = _intervalsBeforeEmissionRateStabilization;
    }

    function reloadFunds(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "Invalid amount");

        lockedSupply = lockedSupply.add(_amount);

        // Note: LockedStakingRewardsPool must have minter role
        TokenBase(token).mint(address(this), _amount);

        emit FundsReloaded(_amount, lockedSupply);
    }

    // _staking amount received from the staking contract
    function releaseFunds(uint256 _stakedTokensAmount) external override onlyOwner {
        require(_stakedTokensAmount > 0, "Invalid Staking amount");

        // calculate funds to release
        uint256 releasedFunds = _stakedTokensAmount.mul(emissionRate);

        // update lockedSupply
        if (releasedFunds > lockedSupply) {
            releasedFunds = lockedSupply;
            lockedSupply = 0;
        } else {
            lockedSupply = lockedSupply.sub(releasedFunds);
        }

        // if locked rewards is less than the funds to release, only release remaining amount
        if (_erc20().balanceOf(rewardsPool) <= releasedFunds) {
            releasedFunds = _erc20().balanceOf(rewardsPool);
        }

        // if amount to release is 0, no-op
        if (releasedFunds == 0) {
            return;
        }
        
        // update emission rate and interval subratction
        if (intervalsBeforeEmissionRateStabilization > 0) {
            emissionRate = emissionRate.sub(emissionRateSlowdown);
            intervalsBeforeEmissionRateStabilization--;
        }

        // Send tokens to the Staking Rewards Pool
        StakingRewardsPool(rewardsPool).receiveFunds(releasedFunds);
        _erc20().transfer(rewardsPool, releasedFunds);

        emit FundsReleased(releasedFunds, lockedSupply, emissionRate, intervalsBeforeEmissionRateStabilization);
    }
    
    uint256[50] private __gap;
}