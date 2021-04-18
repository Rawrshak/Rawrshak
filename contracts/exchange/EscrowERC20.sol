// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "../utils/LibConstants.sol";

contract EscrowERC20 is StorageBase {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    address public token;
    mapping(uint256 => uint256) public escrowedTokensByOrder;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowERC20_init(address _token) public initializer {
        require(
            _token.isContract() && 
            ERC165CheckerUpgradeable.supportsInterface(_token, LibConstants._INTERFACE_ID_TOKENBASE),
            "Invalid erc 20 contract interface.");
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        token = _token;
    }  
    
    function deposit(
        address user,
        uint256 orderId,
        uint256 amount
    ) external checkPermissions(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[orderId] = SafeMathUpgradeable.add(escrowedTokensByOrder[orderId], amount);

        IERC20Upgradeable(token).transferFrom(user, address(this), amount);
    }

    function withdraw(address user, uint256 orderId, uint256 amount) external checkPermissions(MANAGER_ROLE) {
        require(escrowedTokensByOrder[orderId] >= amount, "Invalid amount");

        escrowedTokensByOrder[orderId] = SafeMathUpgradeable.sub(escrowedTokensByOrder[orderId], amount);
        IERC20Upgradeable(token).transferFrom(address(this), user, amount);
    }

    function withdraw(uint256 orderId, uint256 amount) external checkPermissions(MANAGER_ROLE) {
        require(escrowedTokensByOrder[orderId] >= amount, "Invalid amount");

        escrowedTokensByOrder[orderId] = SafeMathUpgradeable.sub(escrowedTokensByOrder[orderId], amount);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}