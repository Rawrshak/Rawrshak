// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "./EscrowERC20.sol";
import "../utils/LibConstants.sol";

contract EscrowDistributions is StorageBase {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    EscrowERC20 public escrow;
    mapping(address => uint256) public claimableTokensByOwner;
    
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowDistributions_init(address _escrow) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();

        // todo: check for correct interface
        require(_escrow.isContract(), "Invalid escrow address.");
        escrow = EscrowERC20(_escrow);
    }
    
    function deposit(
        address from,
        address to,
        uint256 amount
    ) external checkPermissions(MANAGER_ROLE) {        
        // No need to do checks. The exchange contracts will do the checks.
        claimableTokensByOwner[to] = SafeMathUpgradeable.add(claimableTokensByOwner[to], amount);
        IERC20Upgradeable(escrow.token()).transferFrom(from, address(this), amount);
    }

    function claim(address to) external checkPermissions(MANAGER_ROLE) {
        require(claimableTokensByOwner[to] > 0, "Tokens were already claimed.");

        uint256 amount = claimableTokensByOwner[to];
        claimableTokensByOwner[to]= 0;
             
        IERC20Upgradeable(escrow.token()).transferFrom(address(this), to, amount);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}