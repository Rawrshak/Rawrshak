// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./StorageBase.sol";
import "./interfaces/IErc20Escrow.sol";
import "../utils/EnumerableMapsExtension.sol";

contract Erc20Escrow is IErc20Escrow, StorageBase {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;
    using EnumerableMapsExtension for *;
    
    /***************** Stored Variables *****************/
    EnumerableSetUpgradeable.AddressSet supportedTokens;

    // claimableByOwner[user][token] = amount
    mapping(address => EnumerableMapsExtension.AddressToUintMap) claimableByOwner;

    // escrowedTokensByOrder
    struct EscrowedAmount {
        address token;
        uint256 amount;
    }
    mapping(uint256 => EscrowedAmount) escrowedByOrder;

    /******************** Public API ********************/
    function __Erc20Escrow_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibInterfaces.INTERFACE_ID_ERC20_ESCROW);
    }

    function addSupportedTokens(address token) external override onlyRole(MANAGER_ROLE) {
        // no need to check for input as we are the only ones to call it and we will always only
        // add an ERC20 token
        supportedTokens.add(token);
    }

    function deposit(
        address _token,
        uint256 _orderId,
        address _sender,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedByOrder[_orderId].token = _token;

        // There are partial order fills so the amounts are added
        escrowedByOrder[_orderId].amount = escrowedByOrder[_orderId].amount + _amount;
        
        // Send the Token Amount to the Escrow
        IERC20Upgradeable(_token).transferFrom(_sender, address(this), _amount);
    }

    function withdraw(
        uint256 _orderId,
        address _receiver,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        require(escrowedByOrder[_orderId].amount >= _amount, "Invalid amount");

        escrowedByOrder[_orderId].amount = escrowedByOrder[_orderId].amount - _amount;
        IERC20Upgradeable(escrowedByOrder[_orderId].token).transfer(_receiver, _amount);
    }
    
    // Deposit Creator Royalties from user to escrow
    function depositRoyalty(
        address _token,
        address _sender,
        address _owner,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        claimableByOwner[_owner].set(_token, claimableByOwner[_owner].get(_token) + _amount);
        IERC20Upgradeable(_token).transferFrom(_sender, address(this), _amount);
    }
    
    // Transfer Creator Royalty from escrowed buy order to escrow
    function transferRoyalty(
        uint256 _orderId,
        address _owner,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {        
        require(escrowedByOrder[_orderId].amount >= _amount, "Invalid royalty amount");

        // No need to do checks. The exchange contracts will do the checks.
        address token = escrowedByOrder[_orderId].token;
        escrowedByOrder[_orderId].amount = escrowedByOrder[_orderId].amount - _amount;
        claimableByOwner[_owner].set(token, claimableByOwner[_owner].get(token) + _amount);
    }

    // Deposit Platform Fees
    function depositPlatformRoyalty(address _token, address _sender, address _feePool, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        IERC20Upgradeable(_token).transferFrom(_sender, _feePool, _amount);
    }

    // Transfer Platform fees from escrowed by order to escrow
    function transferPlatformRoyalty(uint256 _orderId, address _feePool, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedByOrder[_orderId].amount = escrowedByOrder[_orderId].amount - _amount;
        IERC20Upgradeable(escrowedByOrder[_orderId].token).transfer(_feePool, _amount);
    }

    function claim(address _owner) external override onlyRole(MANAGER_ROLE) {
        // Check should be done above this
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (address token, uint256 amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                claimableByOwner[_owner].set(token, 0);
                IERC20Upgradeable(token).transfer(_owner, amount);
            }
        }
    }

    function isTokenSupported(address token) public override view returns(bool) {
        return supportedTokens.contains(token);
    }

    function escrowedTokensByOrder(uint256 _orderId) external override view returns(uint256) {
        return escrowedByOrder[_orderId].amount;
    }
    
    function claimableTokensByOwner(address _owner) external override view returns(address[] memory tokens, uint256[] memory amounts) {
        // Check should be done above this
        
        // Count how much memory to allocate
        uint256 counter = 0;
        address token;
        uint256 amount;
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (, amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                counter++;
            }
        }

        // Count how much memory to allocate
        tokens = new address[](counter);
        amounts = new uint256[](counter);
        counter = 0;
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (token, amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                tokens[counter] = token;
                amounts[counter] = amount;
                counter++;
            }
        }
    }


    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}