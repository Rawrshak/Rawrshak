// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "./EscrowDistributions.sol";
import "../content/LibRoyalties.sol";
import "../content/Content.sol";

contract RoyaltyManager is ManagerBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(bytes4 => bytes4) public tokenDistribution;
    LibRoyalties.Fees[] internal exchangeFees;

    /*********************** Events *********************/
    event PlatformFeesUpdated(LibRoyalties.Fees[] fees);
    event RoyaltiesDistributed(uint256 orderId, address to, address tokenAddr, uint256 amount);
    event RoyaltiesClaimed(address to, address tokenAddr, uint256 amountClaimed);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __RoyaltyManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
    }

    function setTokenDistribution(bytes4 _token, bytes4 _tokenDistribution) external onlyOwner {
        tokenDistribution[_token] = _tokenDistribution;
    }

    function claimRoyalties(address _user, bytes4 _token) external onlyOwner {
        uint256 amountClaimed = EscrowDistributions(registry.getAddress(tokenDistribution[_token])).claimableTokensByOwner(_user);
        EscrowDistributions(registry.getAddress(tokenDistribution[_token])).claim(_user);
        emit RoyaltiesClaimed(_user, EscrowERC20(registry.getAddress(_token)).token(), amountClaimed);
    }

    function deductRoyaltiesFromUser(uint256 _orderId, address _from, bytes4 _token, LibOrder.AssetData calldata _asset, uint256 total) external onlyOwner returns(uint256 remaining){
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

    function deductRoyaltiesFromEscrow(uint256 _orderId, bytes4 _token, LibOrder.AssetData calldata _asset, uint256 total) external onlyOwner returns(uint256 remaining){
        remaining = total;
        
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

    function setPlatformFees(LibRoyalties.Fees[] calldata _newFees) external onlyOwner {
        if (exchangeFees.length > 0) {
            delete exchangeFees;
        }
        for (uint256 i = 0; i < _newFees.length; ++i) {
            exchangeFees.push(_newFees[i]);
        }
        emit PlatformFeesUpdated(_newFees);
    }
    
    function getDistributionsAmount(address _user, bytes4 _token) external view returns(uint256) {        
        return EscrowDistributions(registry.getAddress(_token)).claimableTokensByOwner(_user);
    }

    /**************** Internal Functions ****************/
    function _depositFromEscrow(uint256 _orderId, address _to, bytes4 _token, uint256 _amount) internal {
        EscrowERC20(registry.getAddress(_token)).withdraw(_orderId, _amount);
        EscrowDistributions(registry.getAddress(tokenDistribution[_token])).deposit(registry.getAddress(_token), _to, _amount);
        emit RoyaltiesDistributed(_orderId, _to, EscrowERC20(registry.getAddress(_token)).token(), _amount);
    }

    function _deposit(uint256 _orderId, address _from, address _to, bytes4 _token, uint256 _amount) internal {
        EscrowDistributions(registry.getAddress(tokenDistribution[_token])).deposit(_from, _to, _amount);
        emit RoyaltiesDistributed(_orderId, _to, EscrowERC20(registry.getAddress(_token)).token(), _amount);
    }

    uint256[50] private __gap;
}