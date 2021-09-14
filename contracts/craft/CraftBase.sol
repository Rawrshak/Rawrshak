// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ICraftBase.sol";
import "../content/Content.sol";
import "../utils/LibConstants.sol";
import "../libraries/LibCraft.sol";

abstract contract CraftBase is ICraftBase, AccessControlUpgradeable, PausableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using LibCraft for *;

    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /***************** Stored Variables *****************/
    uint256 internal seed;

    /******************** Public API ********************/
    function __CraftBase_init_unchained(uint256 _seed) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _pause();
        seed = _seed;
    }
    
    function registerManager(address _manager) external override whenPaused() onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_msgSender(), _manager);
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function managerSetPause(bool _setPause) external override onlyRole(MANAGER_ROLE) {
        if (_setPause) {
            _pause();
        } else {
            _unpause();
        }
    }

    uint256[50] private __gap;
}