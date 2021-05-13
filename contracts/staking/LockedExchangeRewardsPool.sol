// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./ExchangeRewardsPool.sol";

contract LockedExchangeRewardsPool is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using SafeMathUpgradeable for uint256;
    
    address public rawrToken;
    address public exchangeRewardsPool;
    uint256 public lockedSupply;

    event FundsReleased(uint256 amount, uint256 lockedFundsLeft);
    event FundsReceived(uint256 amount, uint256 rewardPoolSupply);
    
    function __LockedExchangeRewardsPool_init(
        address _token,
        address _exchangeRewardsPool
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC165_init_unchained();

        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibConstants._INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
            
        require(_exchangeRewardsPool.isContract(),
            "Invalid Staking Rewards Pool contract interface.");

        rawrToken = _token;
        exchangeRewardsPool = _exchangeRewardsPool;
        lockedSupply = 0;
    }

    function receiveFunds(uint256 _amount) external onlyOwner {
        require(_amount > 0, "Invalid amount");

        lockedSupply = lockedSupply.add(_amount);
        emit FundsReceived(_amount, lockedSupply);
    }

    // _staking amount received from the staking contract
    function releaseFunds(uint256 _stakedTokensAmount) external onlyOwner {
        require(_stakedTokensAmount > 0, "Invalid Staking amount");

        // calculate funds to release
        uint256 releasedFunds = lockedSupply;

        // update lockedSupply
        lockedSupply = 0;

        // Send tokens to the Staking Rewards Pool
        ExchangeRewardsPool(exchangeRewardsPool).receiveFunds(releasedFunds);
        _erc20().transfer(exchangeRewardsPool, releasedFunds);

        emit FundsReleased(releasedFunds, lockedSupply);
    }
    
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(rawrToken);
    }
    
    uint256[50] private __gap;
}