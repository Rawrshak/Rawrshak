// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ManagerBase.sol";
import "../libraries/LibRoyalties.sol";
import "../content/Content.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IExchangeFeePool.sol";
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

    function claimRoyalties(address _user, bytes4 _token) external override onlyOwner {
        uint256 amountClaimed = _claimableRoyaltyAmount(_user, _token);
        _tokenEscrow(_token).claim(_user);
        emit RoyaltiesClaimed(_user, _tokenEscrow(_token).token(), amountClaimed);
    }

    function depositRoyalty(
        address _sender,
        bytes4 _token,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill sell order where Tokens are sent from the buyer to the escrow. We 
        // need to update the royalties table internally 
        for (uint256 i = 0; i < _accounts.length; ++i) {
            _tokenEscrow(_token).depositRoyalty(_sender, _accounts[i], _amounts[i]);
        }
    }

    function depositPlatformRoyalty(
        address _sender,
        bytes4 _token,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeePool().rate()) / (1 ether);
        _tokenEscrow(_token).depositPlatformRoyalty(_sender, address(_exchangeFeePool()), feeAmount);
        _exchangeFeePool().depositRoyalty(_token, _tokenEscrow(_token).token(), feeAmount);
    }

    function transferRoyalty(
        bytes4 _token,
        uint256 _orderId,
        address[] memory _accounts,
        uint256[] memory _amounts
    ) external override onlyOwner {
        // No need to do checks. these values are returned from requiredRoyalties()
        // This is called in a fill buy order where Tokens are stored in the escrow and need to be "moved"
        // to the "claimable" table for the asset creator

        for (uint256 i = 0; i < _accounts.length; ++i) {
            _tokenEscrow(_token).transferRoyalty(_orderId, _accounts[i], _amounts[i]);
        }
    }

    function transferPlatformRoyalty(
        bytes4 _token,
        uint256 _orderId,
        uint256 _total
    ) external override onlyOwner {
        uint256 feeAmount = (_total * _exchangeFeePool().rate()) / (1 ether);
        _tokenEscrow(_token).transferPlatformRoyalty(_orderId, address(_exchangeFeePool()), feeAmount);
        _exchangeFeePool().depositRoyalty(_token, _tokenEscrow(_token).token(), feeAmount);
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
            royalty = (_total * fees[i].rate) / (1 ether);
            accounts[idx] = fees[i].account;
            royaltyAmounts[idx] = royalty;
            remaining = remaining - royalty;
            ++idx;
        }

        royalty = (_total * _exchangeFeePool().rate()) / (1 ether);
        remaining = remaining - royalty;
    }

    function claimableRoyaltyAmount(address _user, bytes4 _token) external view override returns(uint256) {        
        return _claimableRoyaltyAmount(_user, _token);
    }

    /**************** Internal Functions ****************/
    function _claimableRoyaltyAmount(address _user, bytes4 _token) internal view returns(uint256) {
        return _tokenEscrow(_token).claimableTokensByOwner(_user);
    }

    function _tokenEscrow(bytes4 _token) internal view returns(IEscrowERC20) {
        return IEscrowERC20(resolver.getAddress(_token));
    }

    function _exchangeFeePool() internal view returns(IExchangeFeePool) {
        return IExchangeFeePool(resolver.getAddress(LibContractHash.CONTRACT_EXCHANGE_FEE_POOL));
    }

    uint256[50] private __gap;
}