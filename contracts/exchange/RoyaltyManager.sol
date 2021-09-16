// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ManagerBase.sol";
import "../libraries/LibRoyalties.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IExchangeFeePool.sol";
import "./interfaces/IErc20Escrow.sol";
import "./ExchangeFeePool.sol";
import "../utils/LibContractHash.sol";

contract RoyaltyManager is IRoyaltyManager, ManagerBase {
    /***************** Stored Variables *****************/

    /******************** Public API ********************/
    function __RoyaltyManager_init(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        _registerInterface(LibInterfaces.INTERFACE_ID_ROYALTY_MANAGER);
    }

    function claimRoyalties(address _user) external override onlyOwner {
        _tokenEscrow().claim(_user);
        emit RoyaltiesClaimed(_user);
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

    function depositPlatformRoyalty(
        address _sender,
        address _token,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeePool().rate()) / 1e6;
        _tokenEscrow().depositPlatformRoyalty(_token, _sender, address(_exchangeFeePool()), feeAmount);
        _exchangeFeePool().depositRoyalty(_token, feeAmount);
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

    function transferPlatformRoyalty(
        address _token,
        uint256 _orderId,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeePool().rate()) / 1e6;
        _tokenEscrow().transferPlatformRoyalty(_orderId, address(_exchangeFeePool()), feeAmount);
        _exchangeFeePool().depositRoyalty(_token, feeAmount);
    }

    function getRequiredRoyalties(
        LibOrder.AssetData calldata _asset,
        uint256 _total
    ) external view override onlyOwner returns(address[] memory accounts, uint256[] memory royaltyAmounts, uint256 remaining) {
        remaining = _total;

        LibRoyalties.Fees[] memory fees = IContent(_asset.contentAddress).getRoyalties(_asset.tokenId);
        royaltyAmounts = new uint256[](fees.length);
        accounts = new address[](fees.length);
        uint256 royalty = 0;
        uint256 idx = 0;
        for (uint256 i = 0; i < fees.length; ++i) {
            // Get Royalties owed per fee
            royalty = (_total * fees[i].rate) / 1e6;
            accounts[idx] = fees[i].account;
            royaltyAmounts[idx] = royalty;
            remaining = remaining - royalty;
            ++idx;
        }

        royalty = (_total * _exchangeFeePool().rate()) / 1e6;
        remaining = remaining - royalty;
    }

    function claimableRoyaltyAmount(address _user) external view override returns(address[] memory tokens, uint256[] memory amounts) {        
        return _claimableRoyaltyAmount(_user);
    }

    /**************** Internal Functions ****************/
    function _claimableRoyaltyAmount(address _user) internal view returns(address[] memory tokens, uint256[] memory amounts) {
        return _tokenEscrow().claimableTokensByOwner(_user);
    }

    function _tokenEscrow() internal view returns(IErc20Escrow) {
        return IErc20Escrow(resolver.getAddress(LibContractHash.CONTRACT_ERC20_ESCROW));
    }

    function _exchangeFeePool() internal view returns(IExchangeFeePool) {
        return IExchangeFeePool(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL));
    }

    uint256[50] private __gap;
}