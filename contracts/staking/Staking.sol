// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./interface/IClaimable.sol";
import "./interface/IStaking.sol";

contract Staking is IStaking, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /***************** Stored Variables *****************/
    address public override token;
    uint256 public override totalStakedTokens;
    mapping(address => uint256) public override stakedAmounts;
    IClaimable stakePool;
    IClaimable exchangeFeePool;
    
    /******************** Public API ********************/
    function __Staking_init(address _token, address _stakePool, address _exchangeFeePool) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();
        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibInterfaces.INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        require(_stakePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_stakePool, LibInterfaces.INTERFACE_ID_CLAIMABLE),
            "Invalid erc 20 contract interface.");
        require(_exchangeFeePool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_exchangeFeePool, LibInterfaces.INTERFACE_ID_CLAIMABLE),
            "Invalid erc 20 contract interface.");

        _registerInterface(LibInterfaces.INTERFACE_ID_STAKING);
        token = _token;
        totalStakedTokens = 0;
        stakePool = IClaimable(_stakePool);
        exchangeFeePool = IClaimable(_exchangeFeePool);
    }
    
    function deposit(uint256 _amount) external override {
        require(_amount > 0, "Invalid amount");

        // add amount staked internally
        stakedAmounts[_msgSender()] = stakedAmounts[_msgSender()] + _amount;
        totalStakedTokens = totalStakedTokens + _amount;

        // this contract must have been approved first
        _erc20().transferFrom(_msgSender(), address(this), _amount);

        emit Deposit(_msgSender(), _amount, stakedAmounts[_msgSender()]);
    }

    function withdraw(uint256 _amount) external override {
        require(_amount > 0, "Invalid withdraw amount.");
        require(_amount <= stakedAmounts[_msgSender()], "Invalid staked amount to withdraw.");

        stakedAmounts[_msgSender()] = stakedAmounts[_msgSender()] - _amount;
        totalStakedTokens = totalStakedTokens - _amount;

        _erc20().transfer(_msgSender(), _amount);

        emit Withdraw(_msgSender(), _amount, stakedAmounts[_msgSender()]);
    }

    function claim() external override {
        require(stakedAmounts[_msgSender()] > 0, "User is not staking.");

        uint256 stakedPercentage = getStakePercentage();
    
        stakePool.claim((stakePool.supply() * stakedPercentage) / (1 ether), _msgSender());
        exchangeFeePool.claim((exchangeFeePool.supply() * stakedPercentage) / (1 ether), _msgSender());
    }

    function getStakePercentage() public view override returns(uint256) {
        if (stakedAmounts[_msgSender()] == 0) {
            return 0;
        }

        uint256 calcBase = 1 ether;
        return (calcBase * stakedAmounts[_msgSender()]) / totalStakedTokens;
    }

    function totalClaimableTokensInInterval() external view override returns(uint256) {
        return stakePool.supply() + exchangeFeePool.supply();
    }

    function unclaimedTokensInInterval() external view override returns(uint256) {
        return stakePool.remaining() + exchangeFeePool.remaining();
    }
    
    /**************** Internal Functions ****************/
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(token);
    }
}