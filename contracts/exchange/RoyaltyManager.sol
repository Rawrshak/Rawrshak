// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "../content/LibRoyalties.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
// import "./interfaces/IEscrowDistributions.sol";

contract RoyaltyManager is IRoyaltyManager, ManagerBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    // mapping(bytes4 => bytes4) tokenDistribution;
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

    function claimRoyalties(address _user, bytes4 _token) external override onlyOwner {
        uint256 amountClaimed = _getDistributionsAmount(_user, _token);
        IEscrowERC20(registry.getAddress(_token)).claim(_user);
        emit RoyaltiesClaimed(_user, IEscrowERC20(registry.getAddress(_token)).getToken(), amountClaimed);
    }

    function depositRoyalty(
        bytes4 _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from getRequiredRoyalties()
        // This is called in a fill sell order where Tokens are sent from the buyer to the escrow. We 
        // need to update the royalties table internally 
        for (uint256 i = 0; i < _accounts.length; ++i) {
            IEscrowERC20(registry.getAddress(_token)).depositRoyalty(_accounts[i], _amounts[i]);
        }
    }

    function transferRoyalty(
        bytes4 _token,
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from getRequiredRoyalties()
        // This is called in a fill buy order where Tokens are stored in the escrow and need to be "moved"
        // to the "claimable" table for the asset creator

        for (uint256 i = 0; i < _accounts.length; ++i) {
            IEscrowERC20(registry.getAddress(_token)).transferRoyalty(_orderId, _accounts[i], _amounts[i]);
        }
    }

    function getRequiredRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view override onlyOwner returns(address[] memory accounts, uint256[] memory royaltyAmounts, uint256 remaining) {
        remaining = _total;

        LibRoyalties.Fees[] memory contractFees = Content(_asset.contentAddress).getRoyalties(_asset.tokenId);
        royaltyAmounts = new uint256[](contractFees.length + exchangeFees.length);
        uint256 royalty = 0;
        uint256 idx = 0;
        for (uint256 i = 0; i < contractFees.length; ++i) {
            // Get Royalties owed per fee
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(_total, contractFees[i].bps), 10000);accounts[idx] = contractFees[i].account;
            royaltyAmounts[idx] = royalty;
            remaining = SafeMathUpgradeable.sub(remaining, royalty);
            ++idx;
        }

        // calculate _total price and add royalties from asset and platform
        for (uint256 i = 0; i < exchangeFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(_total, exchangeFees[i].bps), 10000);accounts[idx] = exchangeFees[i].account;
            royaltyAmounts[idx] = royalty;
            remaining = SafeMathUpgradeable.sub(remaining, royalty);
            ++idx;
        }
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
        return IEscrowERC20(registry.getAddress(_token)).getClaimableTokensByOwner(_user);
    }

    uint256[50] private __gap;
}