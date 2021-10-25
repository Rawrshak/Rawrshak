// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "./EscrowBase.sol";
import "./interfaces/IErc20Escrow.sol";
import "../utils/EnumerableMapsExtension.sol";

contract Erc20Escrow is IErc20Escrow, EscrowBase {
    /******************** Constants ********************/
    /*
     * IErc20Escrow == 0xfeb2d5c7
     * IEscrowBase: 0x7965db0b
     * IAccessControlUpgradeable: 0x7965db0b
     */

    using EnumerableSetUpgradeable for *;
    using EnumerableMapsExtension for *;
    
    /***************** Stored Variables *****************/
    EnumerableSetUpgradeable.AddressSet supportedTokens;

    struct EscrowedAmount {
        address token;
        uint256 amount;
    }
    mapping(uint256 => EscrowedAmount) escrowedByOrder;
    mapping(address => EnumerableMapsExtension.AddressToUintMap) claimableByOwner;

    /******************** Public API ********************/
    function initialize() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __EscrowBase_init_unchained();
        __Erc20Escrow_init_unchained();
    }

    function __Erc20Escrow_init_unchained() internal initializer {
        _registerInterface(type(IErc20Escrow).interfaceId);
    }

    function addSupportedTokens(address token) external override onlyRole(MANAGER_ROLE) {
        // no need to check for input as we are the only ones to call it and we will always only
        // add an ERC20 token
        supportedTokens.add(token);

        emit AddedTokenSupport(token);
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
    function transferRoyalty(
        address _token,
        address _sender,
        address _owner,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        if (!claimableByOwner[_owner].contains(_token)) {
            claimableByOwner[_owner].set(_token, _amount);
        } else {
            claimableByOwner[_owner].set(_token, claimableByOwner[_owner].get(_token) + _amount);
        }
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

        if (!claimableByOwner[_owner].contains(token)) {
            claimableByOwner[_owner].set(token, _amount);
        } else {
            claimableByOwner[_owner].set(token, claimableByOwner[_owner].get(token) + _amount);
        }
    }

    // Deposit Platform Fees
    function transferPlatformFee(address _token, address _sender, address _feesEscrow, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        IERC20Upgradeable(_token).transferFrom(_sender, _feesEscrow, _amount);
    }

    // Transfer Platform fees from escrowed by order to escrow
    function transferPlatformFee(uint256 _orderId, address _feesEscrow, uint256 _amount) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedByOrder[_orderId].amount = escrowedByOrder[_orderId].amount - _amount;
        IERC20Upgradeable(escrowedByOrder[_orderId].token).transfer(_feesEscrow, _amount);
    }

    function claimRoyalties(address _owner) external override onlyRole(MANAGER_ROLE) {
        // Check should be done above this
        uint256 numOfTokens = _getClaimableTokensLength(_owner);
        uint256 counter = 0;
        address[] memory tokens = new address[](numOfTokens);
        uint256[] memory amounts = new uint256[](numOfTokens);
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (address token, uint256 amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                // Note: we're not removing the entry because we expect that it will be used
                // again eventually.
                claimableByOwner[_owner].set(token, 0);
                IERC20Upgradeable(token).transfer(_owner, amount);
                tokens[counter] = token;
                amounts[counter] = amount;
                counter++;
            }
        }

        emit ClaimedRoyalties(_owner, tokens, amounts);
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
        uint256 numOfTokens = _getClaimableTokensLength(_owner);
        tokens = new address[](numOfTokens);
        amounts = new uint256[](numOfTokens);
        uint256 counter = 0;
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (address token, uint256 amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                tokens[counter] = token;
                amounts[counter] = amount;
                counter++;
            }
        }
    }

    /**************** Internal Functions ****************/
    function _getClaimableTokensLength(address _owner) internal view returns(uint256) {
        uint256 counter = 0;
        for (uint256 i = 0; i < claimableByOwner[_owner].length(); i++) {
            (, uint256 amount) = claimableByOwner[_owner].at(i);
            if (amount > 0) {
                counter++;
            }
        }
        return counter;
    }

    uint256[50] private __gap;
}