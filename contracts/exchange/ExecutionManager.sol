// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ManagerBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";

contract ExecutionManager is ManagerBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/

    /*********************** Events *********************/

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ExecutionManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
    }

    function placeBuyOrder(uint256 _orderId, bytes4 _token, uint256 _tokenAmount) external onlyOwner {
        EscrowERC20(registry.getAddress(_token)).deposit(_msgSender(), _orderId, _tokenAmount);
    }

    function placeSellOrder(uint256 _orderId, LibOrder.AssetData memory _asset, uint256 _assetAmount) external onlyOwner {
        EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), _orderId, _assetAmount, _asset);
    }

    function executeBuyOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        LibOrder.AssetData calldata _asset,
        bytes4 _token) 
        external onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Send Assets to user
            EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), _orderIds[i], _amounts[i], _asset);
            
            // send payment to escrow as claimable per order
            EscrowERC20(registry.getAddress(_token)).withdraw(_msgSender(), _orderIds[i], _paymentPerOrder[i]);
        }

    }

    // Send assets from escrow to user, send tokens from user to escrow
    function executeSellOrder(
        uint256[] calldata _orderIds,
        uint256[] calldata _paymentPerOrder,
        uint256[] calldata _amounts,
        bytes4 _token)
        external onlyOwner 
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        // send payment to escrow as claimable per order
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            EscrowERC20(registry.getAddress(_token)).deposit(_msgSender(), _orderIds[i], _paymentPerOrder[i]);
        }

        // send asset to buyer
        EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdrawBatch(_msgSender(), _orderIds, _amounts);
    }

    function deleteOrder(uint256 _orderId) external onlyOwner {
        LibOrder.OrderData memory order = OrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderId);
        if (order.isBuyOrder) {
            // withdraw ERC20            
            EscrowERC20(registry.getAddress(order.token)).withdraw(
                _msgSender(),
                _orderId,
                SafeMathUpgradeable.mul(order.price, order.amount));
        } else {
            // withdraw NFTs
            EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), _orderId, order.amount);
        }
    }

    function claimOrders(uint256[] calldata _orderIds) external onlyOwner {
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            order = OrderbookStorage(registry.getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderIds[i]);
            require(order.owner == _msgSender(), "User doesn't own this order");
            if (order.isBuyOrder) {
                // withdraw NFTs
                amount = EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).escrowedAssetsByOrder(_orderIds[i]);
                EscrowNFTs(registry.getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), _orderIds[i], amount);
            } else {
                // withdraw ERC20               
                amount = EscrowERC20(registry.getAddress(order.token)).escrowedTokensByOrder(_orderIds[i]);
                EscrowERC20(registry.getAddress(order.token)).withdraw(
                    _msgSender(),
                    _orderIds[i],
                    amount);
            }
        }
    }

    function verifyUserBalance(bytes4 _token, uint256 amountDue) external view returns(bool) {
        return IERC20Upgradeable(EscrowERC20(registry.getAddress(_token)).token()).balanceOf(_msgSender()) >= amountDue;
    }

    /**************** Internal Functions ****************/
    
    uint256[50] private __gap;
}