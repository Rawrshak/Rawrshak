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
    event RoyaltiesDistributed(address from, address to, address tokenAddr, uint256 amount);
    event RoyaltiesClaimed(address to, address tokenAddr, uint256 amountClaimed);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __RoyaltyManagement_init_unchained() public initializer {
    }

    /**************** Internal Functions ****************/
    function _claimRoyalties(address user, address tokenAddr) internal {
        uint256 amountClaimed = EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claimableTokensByOwner(user, tokenAddr);
        EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claim(user, tokenAddr);
        emit RoyaltiesClaimed(user, tokenAddr, amountClaimed);
    }

    function _deposit(address from, address to, address tokenAddr, uint256 amount) internal {
        EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).deposit(from, to, tokenAddr, amount);
        emit RoyaltiesDistributed(from, to, tokenAddr, amount);
    }

    function _setPlatformFees(LibRoyalties.Fees[] memory newFees) internal {
        if (exchangeFees.length > 0) {
            delete exchangeFees;
        }
        for (uint256 i = 0; i < newFees.length; ++i) {
            exchangeFees.push(newFees[i]);
        }
        emit PlatformFeesUpdated(newFees);
    }
    
    function _getDistributionsAmount(address user, address tokenAddr) internal view returns(uint256) {        
        return EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claimableTokensByOwner(user, tokenAddr);
    }


    uint256[50] private __gap;
}