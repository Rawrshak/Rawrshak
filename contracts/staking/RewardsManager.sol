// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./interface/IRewardsManager.sol";
import "./interface/ILockedFundPool.sol";
import "../exchange/interfaces/IExchangeFeesEscrow.sol";
import "./interface/IStaking.sol";
import "../utils/LibInterfaces.sol";

contract RewardsManager is IRewardsManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /***************** Stored Variables *****************/
    IStaking staking;
    ILockedFundPool lockedStakingPool;
    ILockedFundPool lockedExchangeFeePool;
    IExchangeFeesEscrow exchangeFeesEscrow;
    uint256 public override stakingInterval;

    /******************** Public API ********************/
    function __RewardsManager_init(address _staking, address _lockedStakingPool, address _lockedExchangeFeePool, address _exchangeFeesEscrow) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        
        require(_staking.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_staking, LibInterfaces.INTERFACE_ID_STAKING),
            "Invalid staking interface.");
        require(_lockedStakingPool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_lockedStakingPool, LibInterfaces.INTERFACE_ID_LOCKED_FUND),
            "Invalid locked staking funding contract interface.");
        require(_lockedExchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_lockedExchangeFeePool, LibInterfaces.INTERFACE_ID_LOCKED_FUND),
            "Invalid locked exchange funding contract interface.");
        require(_exchangeFeesEscrow.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_exchangeFeesEscrow, LibInterfaces.INTERFACE_ID_EXCHANGE_FEES_ESCROW),
            "Invalid Exchange Fee Pool interface.");

        _registerInterface(LibInterfaces.INTERFACE_ID_REWARDS_MANAGER);
        stakingInterval = 0;
        staking = IStaking(_staking);
        lockedStakingPool = ILockedFundPool(_lockedStakingPool);
        lockedExchangeFeePool = ILockedFundPool(_lockedExchangeFeePool);
        exchangeFeesEscrow = IExchangeFeesEscrow(_exchangeFeesEscrow);
    }

    function nextStakingInterval() external override onlyOwner {
        ++stakingInterval;

        uint256 stakedTokens = staking.totalStakedTokens();

        lockedStakingPool.releaseFunds(stakedTokens);
        lockedExchangeFeePool.releaseFunds(stakedTokens);
    }

    function reloadStaking(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "Invalid amount");

        lockedStakingPool.reloadFunds(_amount);
    }

    function distributeExchangeFees() external override onlyOwner {
        uint256 exchangeFees = exchangeFeesEscrow.totalFeePool(staking.token());
        if (exchangeFees == 0) {
            return;
        }

        lockedExchangeFeePool.reloadFunds(exchangeFees);

        exchangeFeesEscrow.distribute();
    }
}