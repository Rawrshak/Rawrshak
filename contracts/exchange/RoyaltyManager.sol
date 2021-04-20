// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "../content/LibRoyalties.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IEscrowDistributions.sol";

contract RoyaltyManager is IRoyaltyManager, ManagerBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(bytes4 => bytes4) tokenDistribution;
    LibRoyalties.Fees[] exchangeFees;

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
        _registerInterface(LibConstants._INTERFACE_ID_ROYALTY_MANAGER);
    }

    function addSupportedToken(bytes4 _token, bytes4 _tokenDistribution) external override onlyOwner {
        tokenDistribution[_token] = _tokenDistribution;
    }

    function claimRoyalties(address _user, bytes4 _token) external override onlyOwner {
        uint256 amountClaimed = _getDistributionsAmount(_user, _token);
        IEscrowDistributions(registry.getAddress(tokenDistribution[_token])).claim(_user);
        emit RoyaltiesClaimed(_user, IEscrowERC20(registry.getAddress(_token)).getToken(), amountClaimed);
    }

    function deductRoyaltiesFromUser(
        uint256 _orderId,
        address _from,
        bytes4 _token,
        LibOrder.AssetData calldata _asset,
        uint256 total
    ) external override onlyOwner returns(uint256 remaining) {
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

    function deductRoyaltiesFromEscrow(
        uint256 _orderId,
        bytes4 _token,
        LibOrder.AssetData calldata _asset,
        uint256 total
    ) external override onlyOwner returns(uint256 remaining) {
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

    function setPlatformFees(LibRoyalties.Fees[] calldata _newFees) external override onlyOwner {
        if (exchangeFees.length > 0) {
            delete exchangeFees;
        }
        for (uint256 i = 0; i < _newFees.length; ++i) {
            exchangeFees.push(_newFees[i]);
        }
        emit PlatformFeesUpdated(_newFees);
    }
    
    function getPlatformFees() external view override returns(LibRoyalties.Fees[] memory) {
        return exchangeFees;
    }

    function getDistributionsAmount(address _user, bytes4 _token) external view override returns(uint256) {        
        return _getDistributionsAmount(_user, _token);
    }

    /**************** Internal Functions ****************/
    function _getDistributionsAmount(address _user, bytes4 _token) internal view returns(uint256) {
        return IEscrowDistributions(registry.getAddress(_token)).getClaimableTokensByOwner(_user);
    }

    function _depositFromEscrow(uint256 _orderId, address _to, bytes4 _token, uint256 _amount) internal {
        IEscrowERC20(registry.getAddress(_token)).withdraw(_orderId, _amount);
        IEscrowDistributions(registry.getAddress(tokenDistribution[_token])).deposit(registry.getAddress(_token), _to, _amount);
        emit RoyaltiesDistributed(_orderId, _to, IEscrowERC20(registry.getAddress(_token)).getToken(), _amount);
    }

    function _deposit(uint256 _orderId, address _from, address _to, bytes4 _token, uint256 _amount) internal {
        IEscrowDistributions(registry.getAddress(tokenDistribution[_token])).deposit(_from, _to, _amount);
        emit RoyaltiesDistributed(_orderId, _to, IEscrowERC20(registry.getAddress(_token)).getToken(), _amount);
    }

    uint256[50] private __gap;
}