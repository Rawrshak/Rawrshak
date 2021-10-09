// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "../utils/LibInterfaces.sol";

abstract contract EscrowBase is AccessControlUpgradeable, ERC165StorageUpgradeable {
        
    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /*********************** Events *********************/
    event ManagerRegistered(address indexed _manager);

    /******************** Public API ********************/
    function __EscrowBase_init_unchained() internal initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function registerManager(address _manager) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}