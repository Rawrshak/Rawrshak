// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";    
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/ICraftBase.sol";
import "../content/interfaces/IContent.sol";
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
    EnumerableSetUpgradeable.AddressSet internal contentContracts;
    uint256 internal seed;
    
    /*********************** Events *********************/
    event ManagerRegistered(address _manager, address _storage);
    event ContentRegistered(address _content);
        
    /********************* Modifiers ********************/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    function __CraftBase_init_unchained(uint256 _seed) public initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _pause();
        seed = _seed;
    }
    
    function registerManager(address _manager) external override whenPaused() checkPermissions(DEFAULT_ADMIN_ROLE) {
        grantRole(MANAGER_ROLE, _manager);
        emit ManagerRegistered(_manager, address(this));
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function registerContent(address _content) external override whenPaused() checkPermissions(MANAGER_ROLE) {
        require(_content.isContract(), "Content address is not an contract");
        require(_content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Contract is not a Content Contract");
        // check if I have the correct permissions
        require(IContent(_content).isSystemOperator(address(this)), "No contract permissions");
        
        contentContracts.add(_content);
        
        emit ContentRegistered(_content);
    }

    function managerSetPause(bool _setPause) external override checkPermissions(MANAGER_ROLE) {
        if (_setPause) {
            _pause();
        } else {
            _unpause();
        }
    }

    uint256[50] private __gap;
}