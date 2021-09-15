// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./ManagerBase.sol";
import "./Orderbook.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IExecutionManager.sol";
import "./interfaces/IErc20Escrow.sol";
import "./interfaces/INftEscrow.sol";
import "../utils/LibContractHash.sol";

contract ExecutionManager is IExecutionManager, ManagerBase {    
    /******************** Public API ********************/
    function __ExecutionManager_init(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        _registerInterface(LibInterfaces.INTERFACE_ID_EXECUTION_MANAGER);
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
                _order.price * _order.amount);
        } else {
            // withdraw NFTs
            _nftEscrow().withdraw(_orderId, _user, _order.amount);
        }
    }

    function claimOrders(address _user, uint256[] calldata _orderIds) external override onlyOwner {
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(_orderbook().exists(_orderIds[i]), "Invalid Order.");
            order = _orderbook().getOrder(_orderIds[i]);
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
    
    function token(bytes4 _token) external view override returns(address) {
        return _tokenEscrow(_token).token();
    }
    
    function tokenEscrow(bytes4 _token) external view override returns(address) {
        return address(resolver.getAddress(_token));
    }
    
    function nftsEscrow() external view override returns(address) {
        return address(resolver.getAddress(LibContractHash.CONTRACT_NFT_ESCROW));
    }

    function verifyUserBalance(address _user, bytes4 _token, uint256 amountDue) external view override returns(bool) {
        return IERC20Upgradeable(_tokenEscrow(_token).token()).balanceOf(_user) >= amountDue;
    }

    function verifyToken(bytes4 _token) external view override returns(bool) {
        return resolver.getAddress(_token) != address(0);
    }

    /**************** Internal Functions ****************/
    function _tokenEscrow(bytes4 _token) internal view returns(IErc20Escrow) {
        return IErc20Escrow(resolver.getAddress(_token));
    }
    
    function _nftEscrow() internal view returns(INftEscrow) {
        return INftEscrow(resolver.getAddress(LibContractHash.CONTRACT_NFT_ESCROW));
    }

    function _orderbook() internal view returns(IOrderbook) {
        return IOrderbook(resolver.getAddress(LibContractHash.CONTRACT_ORDERBOOK));
    }
    
    uint256[50] private __gap;
}