// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./StakingRewardsPool.sol";

contract LockedStakingRewardsPool is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    
    address public rawrToken;
    address public stakingRewardsPool;
    uint256 public lockedSupply;    // 25% 
    uint256 public emissionRate;    // (1.2^(1/52))-1 at the start
    uint256 public emissionRateSlowdown; // (1.2-1.02)/260 
    uint256 public intervalsBeforeEmissionRateStabilization;    // 260 - 5 years (260 weeks)

    event FundsReleased(uint256 amount, uint256 lockedFundsLeft, uint256 newEmissionsRate, uint256 intervalsLeft);
    
    function __LockedStakingRewardsPool_init(
        address _token,
        address _stakingRewardsPool,
        uint256 _lockedSupply,
        uint256 _emissionRate,
        uint256 _emissionRateSlowdown,
        uint256 _intervalsBeforeEmissionRateStabilization
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();

        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibConstants._INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
            
        require(_stakingRewardsPool.isContract(),
            "Invalid Staking Rewards Pool contract interface.");

        rawrToken = _token;
        stakingRewardsPool = _stakingRewardsPool;
        lockedSupply = _lockedSupply;
        emissionRate = _emissionRate;
        emissionRateSlowdown = _emissionRateSlowdown;
        intervalsBeforeEmissionRateStabilization = _intervalsBeforeEmissionRateStabilization;
    }

    function replenishFunds(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid amount");

        lockedSupply = lockedSupply.add(_amount);

        // Note: LockedStakingRewardsPool must have minter role
        TokenBase(rawrToken).mint(address(this), _amount);
    }

    // _staking amount received from the staking contract
    function releaseFunds(uint256 _stakedTokensAmount) external onlyOwner {
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
        if (_erc20().balanceOf(stakingRewardsPool) <= releasedFunds) {
            releasedFunds = _erc20().balanceOf(stakingRewardsPool);
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
        StakingRewardsPool(stakingRewardsPool).receiveFunds(releasedFunds);
        _erc20().transfer(stakingRewardsPool, releasedFunds);

        emit FundsReleased(releasedFunds, lockedSupply, emissionRate, intervalsBeforeEmissionRateStabilization);
    }
    
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(rawrToken);
    }
    
    uint256[50] private __gap;
}