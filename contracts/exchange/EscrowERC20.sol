// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./StorageBase.sol";
import "./interfaces/IEscrowERC20.sol";
// import "./interfaces/IEscrowDistributions.sol";

contract EscrowERC20 is IEscrowERC20, StorageBase {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    address token;
    mapping(uint256 => uint256) escrowedTokensByOrder;
    mapping(address => uint256) private claimableTokensByOwner;

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
        _registerInterface(LibConstants._INTERFACE_ID_ESCROW_ERC20);
        
        token = _token;
    }

    function getToken() external view override returns(address) {
        return token;
    }
    
    function getEscrowedTokensByOrder(uint256 _orderId) external view override returns(uint256) {
        return escrowedTokensByOrder[_orderId];
    }

    function getClaimableTokensByOwner(address _owner) external view override returns(uint256) {
        return claimableTokensByOwner[_owner];
    }
    
    function deposit(
        uint256 _orderId,
        uint256 _amount
    ) external override checkPermissions(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[_orderId] = SafeMathUpgradeable.add(escrowedTokensByOrder[_orderId], _amount);
    }

    // This is specificly used for royalties
    function withdraw(uint256 _orderId, uint256 _amount) external override checkPermissions(MANAGER_ROLE) {
        require(escrowedTokensByOrder[_orderId] >= _amount, "Invalid _amount");

        escrowedTokensByOrder[_orderId] = SafeMathUpgradeable.sub(escrowedTokensByOrder[_orderId], _amount);
    }
    
    function transferRoyalty(
        uint256 _orderId,
        address _owner,
        uint256 _amount
    ) external override checkPermissions(MANAGER_ROLE) {        
        require(escrowedTokensByOrder[_orderId] >= _amount, "Invalid _amount");

        // No need to do checks. The exchange contracts will do the checks.
        escrowedTokensByOrder[_orderId] = SafeMathUpgradeable.sub(escrowedTokensByOrder[_orderId], _amount);
        claimableTokensByOwner[_owner] = SafeMathUpgradeable.add(claimableTokensByOwner[_owner], _amount);
    }

    function claim(address _owner) external override checkPermissions(MANAGER_ROLE) {
        require(claimableTokensByOwner[_owner] > 0, "Tokens were already claimed.");

        claimableTokensByOwner[_owner]= 0;
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}