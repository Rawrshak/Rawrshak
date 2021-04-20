// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "./interfaces/IEscrowERC20.sol";
import "./interfaces/IEscrowDistributions.sol";
import "../utils/LibConstants.sol";

contract EscrowDistributions is IEscrowDistributions, StorageBase {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    IEscrowERC20 private escrow;
    mapping(address => uint256) private claimableTokensByOwner;
    
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowDistributions_init(address _escrow) public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_ESCROW_DISTRIBUTIONS);

        // todo: check for correct interface
        require(_escrow.isContract(), "Invalid escrow address.");
        escrow = IEscrowERC20(_escrow);
    }

    function getClaimableTokensByOwner(address owner) external view override returns(uint256) {
        return claimableTokensByOwner[owner];
    }
    
    function deposit(
        address from,
        address to,
        uint256 amount
    ) external override checkPermissions(MANAGER_ROLE) {        
        // No need to do checks. The exchange contracts will do the checks.
        claimableTokensByOwner[to] = SafeMathUpgradeable.add(claimableTokensByOwner[to], amount);
        IERC20Upgradeable(escrow.getToken()).transferFrom(from, address(this), amount);
    }

    function claim(address to) external override checkPermissions(MANAGER_ROLE) {
        require(claimableTokensByOwner[to] > 0, "Tokens were already claimed.");

        uint256 amount = claimableTokensByOwner[to];
        claimableTokensByOwner[to]= 0;
             
        IERC20Upgradeable(escrow.getToken()).transferFrom(address(this), to, amount);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}