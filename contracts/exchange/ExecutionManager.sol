// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "./OrderbookStorage.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IExecutionManager.sol";
import "./interfaces/IEscrowERC20.sol";
import "./interfaces/IEscrowNFTs.sol";

contract ExecutionManager is IExecutionManager, ManagerBase {
    using SafeMathUpgradeable for uint256;
    
    /******************** Public API ********************/
    function __ExecutionManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
        _registerInterface(LibConstants._INTERFACE_ID_EXECUTION_MANAGER);
    }
    
    function token(bytes4 _token) external view override returns(address) {
        return _tokenEscrow(_token).token();
    }
    
    function tokenEscrow(bytes4 _token) external view override returns(address) {
        return address(registry.getAddress(_token));
    }
    
    function nftsEscrow() external view override returns(address) {
        return address(registry.getAddress(ESCROW_NFTS_CONTRACT));
    }

    function placeBuyOrder(uint256 _orderId, bytes4 _token, address _sender, uint256 _tokenAmount) external override onlyOwner {
        _tokenEscrow(_token).deposit(_orderId, _sender, _tokenAmount);
    }

    function placeSellOrder(uint256 _orderId, address _sender, LibOrder.AssetData memory _asset, uint256 _assetAmount) external override onlyOwner {
        _nftEscrow().deposit(_orderId, _sender, _assetAmount, _asset);
    }

    function executeBuyOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset,
        bytes4 _token) 
        external override onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Send Assets to escrow
            _nftEscrow().deposit(_orderIds[i], _user, _amounts[i], _asset);
            
            // send payment from escrow to user
            _tokenEscrow(_token).withdraw(_orderIds[i], _user, _paymentPerOrder[i]);
        }
    }

    // Send assets from escrow to user, send tokens from user to escrow
    function executeSellOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        bytes4 _token)
        external override onlyOwner 
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        // send payment from user to escrow
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            _tokenEscrow(_token).deposit(_orderIds[i], _user, _paymentPerOrder[i]);
        }

        // send asset to buyer
        _nftEscrow().withdrawBatch(_orderIds, _user, _amounts);
    }

    function deleteOrder(uint256 _orderId, address _user, LibOrder.OrderData memory _order) external override onlyOwner {
        
        if (_order.isBuyOrder) {
            // withdraw ERC20
            _tokenEscrow(_order.token).withdraw(
                _orderId,
                _user, 
                _order.price.mul(_order.amount));
        } else {
            // withdraw NFTs
            _nftEscrow().withdraw(_orderId, _user, _order.amount);
        }
    }

    function claimOrders(address _user, uint256[] calldata _orderIds) external override onlyOwner {
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(_orderbookStorage().orderExists(_orderIds[i]), "Invalid Order.");
            order = _orderbookStorage().getOrder(_orderIds[i]);
            require(order.owner == _user, "User doesn't own this order");
            if (order.isBuyOrder) {
                // withdraw NFTs
                amount = _nftEscrow().escrowedAssetsByOrder(_orderIds[i]);
                _nftEscrow().withdraw(_orderIds[i], _user, amount);
            } else {
                // withdraw ERC20      
                amount = _tokenEscrow(order.token).escrowedTokensByOrder(_orderIds[i]);
                _tokenEscrow(order.token).withdraw(
                    _orderIds[i],
                    _user,
                    amount);
            }
        }
    }

    function verifyUserBalance(address _user, bytes4 _token, uint256 amountDue) external view override returns(bool) {
        return IERC20Upgradeable(_tokenEscrow(_token).token()).balanceOf(_user) >= amountDue;
    }

    function verifyToken(bytes4 _token) external view override returns(bool) {
        return registry.getAddress(_token) != address(0);
    }

    /**************** Internal Functions ****************/
    function _tokenEscrow(bytes4 _token) internal view returns(IEscrowERC20) {
        return IEscrowERC20(registry.getAddress(_token));
    }
    
    function _nftEscrow() internal view returns(IEscrowNFTs) {
        return IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT));
    }

    function _orderbookStorage() internal view returns(IOrderbookStorage) {
        return IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT));
    }
    
    uint256[50] private __gap;
}