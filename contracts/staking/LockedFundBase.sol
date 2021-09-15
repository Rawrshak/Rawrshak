// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./ExchangeRewardsPool.sol";
import "./interface/ILockedFundPool.sol";

abstract contract LockedFundBase is ILockedFundPool, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    
    /***************** Stored Variables *****************/
    address token;
    address rewardsPool;
    uint256 public override lockedSupply;
    
    /******************** Public API ********************/
    function __LockedFundBase_init_unchained(
        address _token,
        address _rewardsPool
    ) public initializer {
        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibInterfaces.INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
            
        require(_rewardsPool.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_rewardsPool, LibInterfaces.INTERFACE_ID_FUND_POOL),
            "Invalid Fund Pool contract interface.");

        _registerInterface(LibInterfaces.INTERFACE_ID_LOCKED_FUND);

        token = _token;
        rewardsPool = _rewardsPool;
        lockedSupply = 0;
    }

    function reloadFunds(uint256 _amount) external override virtual onlyOwner {
    }

    function releaseFunds(uint256 _stakedTokensAmount) external override virtual onlyOwner {
    }
    
    /**************** Internal Functions ****************/
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(token);
    }
    
    uint256[50] private __gap;
}