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
        __ExecutionManager_init_unchained();
    }

    function __ExecutionManager_init_unchained() internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_EXECUTION_MANAGER);
    }

    function placeBuyOrder(uint256 _orderId, address _token, address _sender, uint256 _tokenAmount) external override onlyOwner {
        _tokenEscrow().deposit(_token, _orderId, _sender, _tokenAmount);
    }

    function placeSellOrder(uint256 _orderId, address _sender, LibOrder.AssetData memory _asset, uint256 _assetAmount) external override onlyOwner {
        _nftEscrow().deposit(_orderId, _sender, _assetAmount, _asset);
    }

    function executeBuyOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset) 
        external override onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Send Assets to escrow
            _nftEscrow().deposit(_orderIds[i], _user, _amounts[i], _asset);
            
            // send payment from escrow to user
            _tokenEscrow().withdraw(_orderIds[i], _user, _paymentPerOrder[i]);
        }
    }

    // Send assets from escrow to user, send tokens from user to escrow
    function executeSellOrder(
        address _user,
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        address _token)
        external override onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        // send payment from user to escrow
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            _tokenEscrow().deposit(_token, _orderIds[i], _user, _paymentPerOrder[i]);
        }

        // send asset to buyer
        _nftEscrow().withdrawBatch(_orderIds, _user, _amounts);
    }

    function cancelOrders(uint256[] memory _orderIds) external override onlyOwner {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            LibOrder.Order memory order = _orderbook().getOrder(_orderIds[i]);
            if (order.isBuyOrder) {
                // withdraw escrowed ERC20
                _tokenEscrow().withdraw(
                    _orderIds[i],
                    order.owner, 
                    order.price * (order.amountOrdered - order.amountFilled));

                // Withdraw partial fill (if any)
                uint256 amount = _nftEscrow().escrowedAmounts(_orderIds[i]);
                if (amount > 0) {
                    _nftEscrow().withdraw(_orderIds[i], order.owner, amount);
                }
            } else {
                // withdraw NFTs
                _nftEscrow().withdraw(_orderIds[i], order.owner, (order.amountOrdered - order.amountFilled));

                // Withdraw partial fill (if any)
                uint256 amount = _tokenEscrow().escrowedTokensByOrder(_orderIds[i]);
                if (amount > 0) {
                    _tokenEscrow().withdraw(_orderIds[i], order.owner, amount);
                }
            }
        }
    }

    function claimOrders(address _user, uint256[] calldata _orderIds) external override onlyOwner {
        LibOrder.Order memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            order = _orderbook().getOrder(_orderIds[i]);

            // Withdraw the escrowed assets from the filled (complete or partial) order
            if (order.isBuyOrder) {
                // Buy order: withdraw NFTs
                amount = _nftEscrow().escrowedAmounts(_orderIds[i]);
                _nftEscrow().withdraw(_orderIds[i], _user, amount);
            } else {
                // Sell order: withdraw ERC20      
                amount = _tokenEscrow().escrowedTokensByOrder(_orderIds[i]);
                _tokenEscrow().withdraw(
                    _orderIds[i],
                    _user,
                    amount);
            }
        }
    }

    function addSupportedToken(address _token) external override onlyOwner {
        _tokenEscrow().addSupportedTokens(_token);
    }
    
    function tokenEscrow() external view override returns(address) {
        return address(_tokenEscrow());
    }
    
    function nftsEscrow() external view override returns(address) {
        return address(_nftEscrow());
    }

    function verifyToken(address _token) external view override returns(bool) {
        return _tokenEscrow().isTokenSupported(_token);
    }

    /**************** Internal Functions ****************/
    function _tokenEscrow() internal view returns(IErc20Escrow) {
        return IErc20Escrow(resolver.getAddress(LibContractHash.CONTRACT_ERC20_ESCROW));
    }
    
    function _nftEscrow() internal view returns(INftEscrow) {
        return INftEscrow(resolver.getAddress(LibContractHash.CONTRACT_NFT_ESCROW));
    }

    function _orderbook() internal view returns(IOrderbook) {
        return IOrderbook(resolver.getAddress(LibContractHash.CONTRACT_ORDERBOOK));
    }
    
    uint256[50] private __gap;
}