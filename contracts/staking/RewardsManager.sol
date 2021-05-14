// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./interface/IRewardsManager.sol";
import "./interface/ILockedFundPool.sol";
import "../exchange/interfaces/IExchangeFeePool.sol";
import "./interface/IStaking.sol";
import "../utils/LibConstants.sol";

contract RewardsManager is IRewardsManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    // using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for *;

    /******************** Constants ********************/
    // bytes4(keccak256('RAWR')) == 0xd4df6855
    bytes4 constant ESCROW_RAWR_CONTRACT = 0xd4df6855;

    /***************** Stored Variables *****************/
    IStaking staking;
    ILockedFundPool stakingPool;
    ILockedFundPool lockedExchangeFeePool;
    IExchangeFeePool exchangeFeePool;
    uint256 stakingInterval;

    /******************** Public API ********************/
    function __Staking_init(address _staking, address _stakingPool, address _lockedExchangeFeePool, address _exchangeFeePool) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        
        require(_staking.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_staking, LibConstants._INTERFACE_ID_STAKING),
            "Invalid locked funding contract interface.");
        require(_stakingPool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_stakingPool, LibConstants._INTERFACE_ID_LOCKED_FUND),
            "Invalid locked funding contract interface.");
        require(_lockedExchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_lockedExchangeFeePool, LibConstants._INTERFACE_ID_LOCKED_FUND),
            "Invalid locked funding contract interface.");
        require(_exchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_exchangeFeePool, LibConstants._INTERFACE_ID_LOCKED_FUND),
            "Invalid locked funding contract interface.");

        _registerInterface(LibConstants._INTERFACE_ID_REWARDS_MANAGER);
        stakingInterval = 0;
        staking = IStaking(_staking);
        stakingPool = ILockedFundPool(_stakingPool);
        lockedExchangeFeePool = ILockedFundPool(_lockedExchangeFeePool);
        exchangeFeePool = IExchangeFeePool(_exchangeFeePool);
    }

    function nextStakingInterval() external override onlyOwner {
        ++stakingInterval;

        uint256 stakedTokens = staking.totalStakedTokens();

        stakingPool.releaseFunds(stakedTokens);
        lockedExchangeFeePool.releaseFunds(stakedTokens);
    }

    function reloadStaking(uint256 _amount) external override onlyOwner {
        require(_amount > 0, "Invalid amount");

        stakingPool.reloadFunds(_amount);
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