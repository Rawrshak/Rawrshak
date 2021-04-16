// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./EscrowDistributions.sol";
import "../content/LibRoyalties.sol";

abstract contract RoyaltyManagement is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    LibRoyalties.Fees[] internal exchangeFees;

    /*********************** Events *********************/
    event PlatformFeesUpdated(LibRoyalties.Fees[] fees);
    event RoyaltiesDistributed(address to, address tokenAddr, uint256 amount);
    event RoyaltiesClaimed(address to, address tokenAddr, uint256 amountClaimed);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __RoyaltyManagement_init() public initializer {
    }

    /**************** Internal Functions ****************/
    function _claimRoyalties(address user, address tokenAddr) internal {
        require(tokenAddr != address(0), "Invalid address");
        require(user != address(0), "Invalid recipient");
        require(contracts[ESCROW_DISTRIBUTIONS_CONTRACT] != address(0), "Distributions Escrow is not yet set");
        
        uint256 amountClaimed = EscrowDistributions(contracts[ESCROW_DISTRIBUTIONS_CONTRACT]).claimableTokensByOwner(user, tokenAddr);
        EscrowDistributions(contracts[ESCROW_DISTRIBUTIONS_CONTRACT]).claim(user, tokenAddr);
        emit RoyaltiesClaimed(user, tokenAddr, amountClaimed);
    }

    function _deposit(address to, address tokenAddr, uint256 amount) internal {
        require(contracts[ESCROW_DISTRIBUTIONS_CONTRACT] != address(0), "Distributions Escrow is not yet set");
        EscrowDistributions(contracts[ESCROW_DISTRIBUTIONS_CONTRACT]).deposit(to, tokenAddr, amount);
        emit RoyaltiesDistributed(to, tokenAddr, amount);
    }

    function _setPlatformFees(LibRoyalties.Fees[] memory newFees) internal {
        if (exchangeFees.length > 0) {
            delete exchangeFees;
        }
        exchangeFees = newFees;
        emit PlatformFeesUpdated(newFees);
    }


    uint256[50] private __gap;
}