// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./EscrowDistributions.sol";
import "../content/LibRoyalties.sol";
import "../content/Content.sol";

contract RoyaltyManager is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    LibRoyalties.Fees[] internal exchangeFees;

    /*********************** Events *********************/
    event PlatformFeesUpdated(LibRoyalties.Fees[] fees);
    event RoyaltiesDistributed(uint256 orderId, address to, address tokenAddr, uint256 amount);
    event RoyaltiesClaimed(address to, address tokenAddr, uint256 amountClaimed);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __RoyaltyManagement_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ExchangeBase_init_unchained(_registry);
    }

    /**************** Internal Functions ****************/
    function claimRoyalties(address user, address tokenAddr) external onlyOwner {
        uint256 amountClaimed = EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claimableTokensByOwner(user, tokenAddr);
        EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claim(user, tokenAddr);
        emit RoyaltiesClaimed(user, tokenAddr, amountClaimed);
    }

    function deductRoyaltiesFromUser(uint256 _orderId, address _from, address _token, LibOrder.AssetData calldata _asset, uint256 total) external onlyOwner returns(uint256 remaining){
        remaining = total;
        
        LibRoyalties.Fees[] memory contractFees = Content(_asset.contentAddress).getRoyalties(_asset.tokenId);
        uint256 royalty = 0;
        for (uint256 i = 0; i < contractFees.length; ++i) {
            // Get Royalties owed per fee
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(total, contractFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_orderId, _from, contractFees[i].account, _token, royalty);
                remaining = SafeMathUpgradeable.sub(remaining, royalty);
            }
        }

        // calculate total price and add royalties from asset and platform
        for (uint256 i = 0; i < exchangeFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(total, exchangeFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_orderId, _from, exchangeFees[i].account, _token, royalty);
                remaining = SafeMathUpgradeable.sub(remaining, royalty);
            }
        }

        // remaining is the amount that is going to the seller
        return remaining;
    }

    function deductRoyaltiesFromEscrow(uint256 _orderId, address _token, LibOrder.AssetData calldata _asset, uint256 total) external onlyOwner returns(uint256 remaining){
        remaining = total;

        // Todo: this
        
        LibRoyalties.Fees[] memory contractFees = Content(_asset.contentAddress).getRoyalties(_asset.tokenId);
        uint256 royalty = 0;
        for (uint256 i = 0; i < contractFees.length; ++i) {
            // Get Royalties owed per fee
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(total, contractFees[i].bps), 10000);
            if (royalty > 0) {
                _depositFromEscrow(_orderId, contractFees[i].account, _token, royalty);
                remaining = SafeMathUpgradeable.sub(remaining, royalty);
            }
        }

        // calculate total price and add royalties from asset and platform
        for (uint256 i = 0; i < exchangeFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(total, exchangeFees[i].bps), 10000);
            if (royalty > 0) {
                _depositFromEscrow(_orderId, exchangeFees[i].account, _token, royalty);
                remaining = SafeMathUpgradeable.sub(remaining, royalty);
            }
        }

        // remaining is the amount that is going to the seller
        return remaining;
    }

    function setPlatformFees(LibRoyalties.Fees[] calldata newFees) external onlyOwner {
        if (exchangeFees.length > 0) {
            delete exchangeFees;
        }
        for (uint256 i = 0; i < newFees.length; ++i) {
            exchangeFees.push(newFees[i]);
        }
        emit PlatformFeesUpdated(newFees);
    }
    
    function getDistributionsAmount(address user, address tokenAddr) external view returns(uint256) {        
        return EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).claimableTokensByOwner(user, tokenAddr);
    }

    function _depositFromEscrow(uint256 orderId, address to, address tokenAddr, uint256 amount) internal {
        EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(orderId, amount);
        EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).deposit(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT), to, tokenAddr, amount);
        emit RoyaltiesDistributed(orderId, to, tokenAddr, amount);
    }

    function _deposit(uint256 orderId, address from, address to, address tokenAddr, uint256 amount) internal {
        EscrowDistributions(_getRegistry().getAddress(ESCROW_DISTRIBUTIONS_CONTRACT)).deposit(from, to, tokenAddr, amount);
        emit RoyaltiesDistributed(orderId, to, tokenAddr, amount);
    }

    uint256[50] private __gap;
}