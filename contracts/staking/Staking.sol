// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "../resolver/IAddressResolver.sol";
import "./interfaces/IStaking.sol";
import "./interfaces/IExchangeFeesEscrow.sol";
import "../utils/LibContractHash.sol";

contract Staking is IStaking, ContextUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /***************** Stored Variables *****************/
    address public override token;
    uint256 public override totalStakedTokens;
    mapping(address => uint256) public override userStakedAmount;
    IAddressResolver resolver;
    
    /******************** Public API ********************/
    function initialize(address _token, address _resolver) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __Staking_init_unchained(_token, _resolver);
    }

    function __Staking_init_unchained(address _token, address _resolver) internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_STAKING);
        token = _token;
        totalStakedTokens = 0;
        resolver = IAddressResolver(_resolver);
    }
    
    function stake(uint256 _amount) external override {
        require(_amount > 0, "Invalid amount");
        
        // First staked tokens
        if (totalStakedTokens > 0) {
            totalStakedTokens += _amount;
        } else {
            totalStakedTokens = _amount;
            _exchangeFeesEscrow().initializeTokenRate();
        }
        
        // Update User Exchange Fees rewards
        _exchangeFeesEscrow().updateUserRewards(_msgSender());

        // add amount staked internally
        userStakedAmount[_msgSender()] += _amount;

        // this contract must have been approved first
        _erc20().transferFrom(_msgSender(), address(this), _amount);

        emit Staked(_msgSender(), _amount, userStakedAmount[_msgSender()]);
    }

    function withdraw(uint256 _amount) public override {
        require(userStakedAmount[_msgSender()] > 0, "User is not staking.");
        require(_amount > 0, "Invalid withdraw amount.");
        
        // Update User Exchange Fees rewards
        _exchangeFeesEscrow().updateUserRewards(_msgSender());

        _withdraw(_amount, _msgSender());

        emit Withdraw(_msgSender(), _amount, userStakedAmount[_msgSender()]);
    }

    function exit() external override {
        require(userStakedAmount[_msgSender()] > 0, "User is not staking.");
        
        // Update User Exchange Fees rewards
        _exchangeFeesEscrow().updateUserRewards(_msgSender());

        uint256 stakedAmount = userStakedAmount[_msgSender()];

        _withdraw(userStakedAmount[_msgSender()], _msgSender());
        _claimRewards(_msgSender());
        emit Withdraw(_msgSender(), stakedAmount, 0);
    }

    function claimRewards() external override {
        require(userStakedAmount[_msgSender()] > 0, "User is not staking.");
        
        // Update User Exchange Fees rewards
        _exchangeFeesEscrow().updateUserRewards(_msgSender());

        _claimRewards(_msgSender());
    }

    function getUserClaimableStakingRewards(address _user) external view override returns(LibStaking.Reward[] memory rewards) {
        // Todo: get the rewards from Staking Rewards pool 
    }

    function getUserClaimableExchangeRewards(address _user) external view override returns(LibStaking.Reward[] memory rewards) {
        return _exchangeFeesEscrow().getClaimableRewards(_user);
    }
    
    /**************** Internal Functions ****************/
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(token);
    }

    function _exchangeFeesEscrow() internal view returns(IExchangeFeesEscrow) {
        return IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_ESCROW));
    }

    function _withdraw(uint256 _amount, address _user) internal {

        userStakedAmount[_user] -= _amount;
        totalStakedTokens -= _amount;

        _erc20().transfer(_user, _amount);
    }

    function _claimRewards(address _user) internal {
        // Todo: Claim rewards from Staking
        _exchangeFeesEscrow().claimRewards(_user);
    }
}