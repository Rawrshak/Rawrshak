// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

abstract contract StorageBase is AccessControlUpgradeable {
        
    /******************** Constants ********************/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /***************** Stored Variables *****************/
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __StorageBase_init_unchained() public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MANAGER_ROLE, _msgSender());
    }

    function registerManager(address _manager) external checkPermissions(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
    }

    /**************** Internal Functions ****************/

}