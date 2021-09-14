// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./ExchangeRewardsPool.sol";
import "./interface/ILockedFundPool.sol";
import "./LockedFundBase.sol";

contract LockedExchangeRewardsPool is LockedFundBase {
    using AddressUpgradeable for address;

    event FundsReleased(address indexed operator, uint256 amount, uint256 lockedFundsLeft);

    /******************** Public API ********************/
    function __LockedExchangeRewardsPool_init(
        address _token,
        address _rewardsPool
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        __LockedFundBase_init_unchained(_token, _rewardsPool);
    }

    function reloadFunds(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "Invalid amount");

        lockedSupply = lockedSupply + _amount;
        emit FundsReloaded(_msgSender(), _amount, lockedSupply);
    }

    // _staking amount received from the staking contract
    function releaseFunds(uint256) external override onlyOwner {
        if (lockedSupply == 0) {
            return;
        }

        uint256 rewardsPoolOwnedTokens = _erc20().balanceOf(address(this));
        require(rewardsPoolOwnedTokens >= lockedSupply, "rewards pool doesn't hold enough tokens.");

        // calculate funds to release
        uint256 releasedFunds = lockedSupply;

        if (rewardsPoolOwnedTokens > lockedSupply) {
            releasedFunds = rewardsPoolOwnedTokens;
        }

        // update lockedSupply
        lockedSupply = 0;

        // Send tokens to the Staking Rewards Pool
        ExchangeRewardsPool(rewardsPool).receiveFunds(releasedFunds);
        _erc20().transfer(rewardsPool, releasedFunds);

        emit FundsReleased(_msgSender(), releasedFunds, lockedSupply);
    }
    
    uint256[50] private __gap;
}