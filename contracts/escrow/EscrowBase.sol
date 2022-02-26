// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/IEscrowBase.sol";

abstract contract EscrowBase is IEscrowBase, AccessControlUpgradeable, ERC165StorageUpgradeable {

    /******************** Constants ********************/
    /*
     * IEscrowBase: 0xc7aacb62
     */
        
    /******************** Constants ********************/
    bytes32 public constant override MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /*********************** Events *********************/
    event ManagerRegistered(address indexed _manager);

    /******************** Public API ********************/
    function __EscrowBase_init_unchained() internal onlyInitializing {
        _registerInterface(type(IEscrowBase).interfaceId);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function registerManager(address _manager) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}