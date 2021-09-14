// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./interface/IRewardsManager.sol";
import "./interface/ILockedFundPool.sol";
import "../exchange/interfaces/IExchangeFeePool.sol";
import "./interface/IStaking.sol";
import "../utils/LibConstants.sol";

contract RewardsManager is IRewardsManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /******************** Constants ********************/
    // bytes4(keccak256('RAWR')) == 0xd4df6855
    bytes4 constant ESCROW_RAWR_CONTRACT = 0xd4df6855;

    /***************** Stored Variables *****************/
    IStaking staking;
    ILockedFundPool lockedStakingPool;
    ILockedFundPool lockedExchangeFeePool;
    IExchangeFeePool exchangeFeePool;
    uint256 public override stakingInterval;

    /******************** Public API ********************/
    function __RewardsManager_init(address _staking, address _lockedStakingPool, address _lockedExchangeFeePool, address _exchangeFeePool) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        
        require(_staking.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_staking, LibConstants._INTERFACE_ID_STAKING),
            "Invalid staking interface.");
        require(_lockedStakingPool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_lockedStakingPool, LibConstants._INTERFACE_ID_LOCKED_FUND),
            "Invalid locked staking funding contract interface.");
        require(_lockedExchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_lockedExchangeFeePool, LibConstants._INTERFACE_ID_LOCKED_FUND),
            "Invalid locked exchange funding contract interface.");
        require(_exchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_exchangeFeePool, LibConstants._INTERFACE_ID_EXCHANGE_FEE_POOL),
            "Invalid Exchange Fee Pool interface.");

        _registerInterface(LibConstants._INTERFACE_ID_REWARDS_MANAGER);
        stakingInterval = 0;
        staking = IStaking(_staking);
        lockedStakingPool = ILockedFundPool(_lockedStakingPool);
        lockedExchangeFeePool = ILockedFundPool(_lockedExchangeFeePool);
        exchangeFeePool = IExchangeFeePool(_exchangeFeePool);
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
        uint256 exchangeFees = exchangeFeePool.totalFeePool(ESCROW_RAWR_CONTRACT);
        if (exchangeFees == 0) {
            return;
        }

        lockedExchangeFeePool.reloadFunds(exchangeFees);

        exchangeFeePool.distribute(ESCROW_RAWR_CONTRACT, staking.token());
    }
}