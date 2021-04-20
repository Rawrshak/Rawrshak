// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";
import "./interfaces/IExecutionManager.sol";
import "./interfaces/IEscrowERC20.sol";
import "./interfaces/IEscrowNFTs.sol";

contract ExecutionManager is IExecutionManager, ManagerBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/

    /*********************** Events *********************/

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ExecutionManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
        _registerInterface(LibConstants._INTERFACE_ID_EXECUTION_MANAGER);
    }
    
    function getToken(bytes4 _token) external view override returns(address) {
        return IEscrowERC20(registry.getAddress(_token)).getToken();
    }
    
    function getTokenEscrow(bytes4 _token) external view override returns(address) {
        return address(registry.getAddress(_token));
    }
    
    function getNFTsEscrow() external view override returns(address) {
        return address(registry.getAddress(ESCROW_NFTS_CONTRACT));
    }

    function placeBuyOrder(uint256 _orderId, bytes4 _token, uint256 _tokenAmount) external override onlyOwner {
        IEscrowERC20(registry.getAddress(_token)).deposit(_orderId, _tokenAmount);
    }

    function placeSellOrder(uint256 _orderId, LibOrder.AssetData memory _asset, uint256 _assetAmount) external override onlyOwner {
        IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).deposit(_orderId, _assetAmount, _asset);
    }

    function executeBuyOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset,
        bytes4 _token) 
        external override onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Send Assets to user
            IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).deposit(_orderIds[i], _amounts[i], _asset);
            
            // send payment to escrow as claimable per order
            IEscrowERC20(registry.getAddress(_token)).withdraw(_orderIds[i], _paymentPerOrder[i]);
        }
    }

    // Send assets from escrow to user, send tokens from user to escrow
    function executeSellOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        bytes4 _token)
        external override onlyOwner 
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        // send payment to escrow as claimable per order
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            IEscrowERC20(registry.getAddress(_token)).deposit(_orderIds[i], _paymentPerOrder[i]);
        }

        // send asset to buyer
        IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdrawBatch(_orderIds, _amounts);
    }

    function deleteOrder(uint256 _orderId) external override onlyOwner {
        LibOrder.OrderData memory order = OrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderId);
        if (order.isBuyOrder) {
            // withdraw ERC20            
            IEscrowERC20(registry.getAddress(order.token)).withdraw(
                _orderId,
                SafeMathUpgradeable.mul(order.price, order.amount));
        } else {
            // withdraw NFTs
            IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_orderId, order.amount);
        }
    }

    function claimOrders(address _user, uint256[] calldata _orderIds) external override onlyOwner {
        IOrderbookStorage orderbookStorage = IOrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT));
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(orderbookStorage.orderExists(_orderIds[i]), "Invalid Order.");
            order = orderbookStorage.getOrder(_orderIds[i]);
            require(order.owner == _user, "User doesn't own this order");
            if (order.isBuyOrder) {
                // withdraw NFTs
                amount = IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).getEscrowedAssetsByOrder(_orderIds[i]);
                IEscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_orderIds[i], amount);
            } else {
                // withdraw ERC20               
                amount = IEscrowERC20(registry.getAddress(order.token)).getEscrowedTokensByOrder(_orderIds[i]);
                IEscrowERC20(registry.getAddress(order.token)).withdraw(
                    _orderIds[i],
                    amount);
            }
        }
    }

    function verifyUserBalance(address _user, bytes4 _token, uint256 amountDue) external view override returns(bool) {
        return IERC20Upgradeable(IEscrowERC20(registry.getAddress(_token)).getToken()).balanceOf(_user) >= amountDue;
    }

    function verifyToken(bytes4 _token) external view override returns(bool) {
        return registry.getAddress(_token) != address(0);
    }

    /**************** Internal Functions ****************/
    
    uint256[50] private __gap;
}