// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "./ManagerBase.sol";
import "../libraries/LibRoyalties.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IExchangeFeesEscrow.sol";
import "./interfaces/IErc20Escrow.sol";
import "./ExchangeFeesEscrow.sol";
import "../utils/LibContractHash.sol";

contract RoyaltyManager is IRoyaltyManager, ManagerBase {
    using ERC165CheckerUpgradeable for address;

    /******************** Public API ********************/
    function __RoyaltyManager_init(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        __RoyaltyManager_init_unchained();
    }

    function __RoyaltyManager_init_unchained() internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_ROYALTY_MANAGER);
    }

    function claimRoyalties(address _user) external override onlyOwner {
        _tokenEscrow().claimRoyalties(_user);
    }

    function depositRoyalty(
        address _sender,
        address _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill sell order where Tokens are sent from the buyer to the escrow. We 
        // need to update the royalties table internally 
        for (uint256 i = 0; i < _accounts.length; ++i) {
            _tokenEscrow().depositRoyalty(_token, _sender, _accounts[i], _amounts[i]);
        }
    }

    function depositPlatformFees(
        address _sender,
        address _token,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeesEscrow().rate()) / 1e6;
        _tokenEscrow().depositPlatformFees(_token, _sender, address(_exchangeFeesEscrow()), feeAmount);
        _exchangeFeesEscrow().depositRoyalty(_token, feeAmount);
    }

    function transferRoyalty(
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill buy order where Tokens are stored in the escrow and need to be "moved"
        // to the "claimable" table for the asset creator

        for (uint256 i = 0; i < _accounts.length; ++i) {
            _tokenEscrow().transferRoyalty(_orderId, _accounts[i], _amounts[i]);
        }
    }

    function transferPlatformFees(
        address _token,
        uint256 _orderId,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeesEscrow().rate()) / 1e6;
        _exchangeFeesEscrow().depositRoyalty(_token, feeAmount);
        _tokenEscrow().transferPlatformFees(_orderId, address(_exchangeFeesEscrow()), feeAmount);
    }

    function payableRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view override onlyOwner returns(address[] memory creators, uint256[] memory creatorRoyaltieFees, uint256 remaining) {
        remaining = _total;

        // Get platform fees
        uint256 platformFees = (_total * _exchangeFeesEscrow().rate()) / 1e6;
        remaining -= platformFees;

        // If IContent is not supported, ignore royalties
        if (!_asset.contentAddress.supportsInterface(LibInterfaces.INTERFACE_ID_CONTENT)) {
            return (creators, creatorRoyaltieFees, remaining);
        }

        LibRoyalties.Fees[] memory fees = IContent(_asset.contentAddress).getRoyalties(_asset.tokenId);
        creatorRoyaltieFees = new uint256[](fees.length);
        creators = new address[](fees.length);
        uint256 royaltyFee = 0;
        uint256 idx = 0;
        for (uint256 i = 0; i < fees.length; ++i) {
            // Get Royalties owed per fee
            royaltyFee = (_total * fees[i].rate) / 1e6;
            creators[idx] = fees[i].account;
            creatorRoyaltieFees[idx] = royaltyFee;
            remaining -= royaltyFee;
            ++idx;
        }
    }

    function claimableRoyalties(address _user) external view override returns(address[] memory tokens, uint256[] memory amounts) {        
        return _claimableRoyalties(_user);
    }

    /**************** Internal Functions ****************/
    function _claimableRoyalties(address _user) internal view returns(address[] memory tokens, uint256[] memory amounts) {
        return _tokenEscrow().claimableTokensByOwner(_user);
    }

    function _tokenEscrow() internal view returns(IErc20Escrow) {
        return IErc20Escrow(resolver.getAddress(LibContractHash.CONTRACT_ERC20_ESCROW));
    }

    function _exchangeFeesEscrow() internal view returns(IExchangeFeesEscrow) {
        return IExchangeFeesEscrow(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL));
    }

    uint256[50] private __gap;
}