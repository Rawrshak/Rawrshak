// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../tokens/RawrToken.sol";
import "./interfaces/IFundPool.sol";

abstract contract FundBase is IFundPool, AccessControlUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;

    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /***************** Stored Variables *****************/
    address rawrToken;
    uint256 public override supply;
    uint256 public override remaining;

    /******************** Public API ********************/
    function __FundBase_init_unchained(address _token) public initializer {
        require(_token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibInterfaces.INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        _registerInterface(LibInterfaces.INTERFACE_ID_FUND_POOL);
        _registerInterface(LibInterfaces.INTERFACE_ID_CLAIMABLE);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        rawrToken = _token;
        supply = 0;
        remaining = 0;
    }
    
    function registerManager(address _manager) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager);
    }

    function receiveFunds(uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        require(_amount > 0, "Invalid amount");

        supply = remaining + _amount;
        remaining = supply;

        emit FundsReceived(_msgSender(), _amount, supply);
    }

    function claim(uint256 _amount, address _recepient) external override onlyRole(MANAGER_ROLE) {
        require(_amount > 0, "Invalid claim");
        require(_amount <= remaining, "amount to claim is invalid.");
        remaining = remaining - _amount;

        _erc20().transfer(_recepient, _amount);

        emit Claimed(_recepient, _amount, remaining);
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**************** Internal Functions ****************/
    function _erc20() internal view returns(IERC20Upgradeable) {
        return IERC20Upgradeable(rawrToken);
    }
    
    uint256[50] private __gap;
}