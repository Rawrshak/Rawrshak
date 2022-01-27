// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "./ManagerBase.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IErc20Escrow.sol";
import "../staking/interfaces/IExchangeFeesEscrow.sol";
import "../staking/ExchangeFeesEscrow.sol";
import "../utils/LibContractHash.sol";

contract RoyaltyManager is IRoyaltyManager, ManagerBase {
    /******************** Interfaces ********************/
    /*
     * IRoyaltyManager == 0x96c4ccf4
     */

    using ERC165CheckerUpgradeable for address;

    /******************** Public API ********************/
    function initialize(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        __RoyaltyManager_init_unchained();
    }

    function __RoyaltyManager_init_unchained() internal initializer {
        _registerInterface(type(IRoyaltyManager).interfaceId);
    }

    function claimRoyalties(address _user) external override onlyOwner {
        _tokenEscrow().claimRoyalties(_user);
    }

    function transferRoyalty(
        address _sender,
        address _token,
        address _receiver,
        uint256 _royaltyFee
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill sell order where Tokens are sent from the buyer to the escrow. We 
        // need to update the royalties table internally 
        if (_royaltyFee > 0) {
            _tokenEscrow().transferRoyalty(_token, _sender, _receiver, _royaltyFee);
        }
    }

    function transferRoyalty(
        uint256 _orderId,
        address _receiver,
        uint256 _fee
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill buy order where Tokens are stored in the escrow and need to be "moved"
        // to the "claimable" table for the asset creator
        if (_fee > 0) {
            _tokenEscrow().transferRoyalty(_orderId, _receiver, _fee);
        }
    }

    function transferPlatformFee(
        address _token,
        uint256 _orderId,
        uint256 _total
    ) external override onlyOwner {
        if (_exchangeFeesEscrow().hasExchangeFees()) {
            // Rate has to be greater than 0 and there must be someone staking. If no one is staking,
            // we ignore platform fees because no one will be able to collect it.
            uint256 feeAmount = (_total * _exchangeFeesEscrow().rate()) / 1e6;
            _exchangeFeesEscrow().depositFees(_token, feeAmount);
            _tokenEscrow().transferPlatformFee(_orderId, address(_exchangeFeesEscrow()), feeAmount);
        }
    }
    
    function transferPlatformFee(
        address _sender,
        address _token,
        uint256 _total
    ) external override onlyOwner {
        if (_exchangeFeesEscrow().hasExchangeFees()) {
            // Rate has to be greater than 0 and there must be someone staking. If no one is staking,
            // we ignore platform fees because no one will be able to collect it.
            uint256 feeAmount = (_total * _exchangeFeesEscrow().rate()) / 1e6;
            _exchangeFeesEscrow().depositFees(_token, feeAmount);
            _tokenEscrow().transferPlatformFee(_token, _sender, address(_exchangeFeesEscrow()), feeAmount);
        }
    }

    function payableRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view override onlyOwner returns(address receiver, uint256 royaltyFee, uint256 remaining) {
        remaining = _total;

        // Get platform fees
        if (_exchangeFeesEscrow().hasExchangeFees()) {
            // Rate has to be greater than 0 and there must be someone staking. If no one is staking,
            // we ignore platform fees because no one will be able to collect it.
            uint256 platformFees = (_total * _exchangeFeesEscrow().rate()) / 1e6;
            remaining -= platformFees;
        }

        if (_asset.contentAddress.supportsInterface(type(IERC2981Upgradeable).interfaceId)) {
            (receiver, royaltyFee) = IERC2981Upgradeable(_asset.contentAddress).royaltyInfo(_asset.tokenId, _total);
            if (remaining >= royaltyFee) {
                remaining -= royaltyFee;
            } else {
                royaltyFee = remaining;
                remaining = 0;
            }
        }
        
        // If contract doesn't support the NFT royalty standard or IContent interface is not supported, ignore royalties
    }

    function claimableRoyalties(address _user) external view override returns(address[] memory tokens, uint256[] memory amounts) {        
        return _tokenEscrow().claimableTokensByOwner(_user);
    }

    /**************** Internal Functions ****************/
    function _tokenEscrow() internal view returns(IErc20Escrow) {
        return IErc20Escrow(resolver.getAddress(LibContractHash.CONTRACT_ERC20_ESCROW));
    }

    function _exchangeFeesEscrow() internal view returns(IExchangeFeesEscrow) {
        return IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_ESCROW));
    }

    uint256[50] private __gap;
}