// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";

contract ExecutionManager is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/

    /*********************** Events *********************/

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ExecutionManager_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ExchangeBase_init_unchained(_registry);
    }

    function placeBuyOrder(uint256 _orderId, address _token, uint256 _tokenAmount) external onlyOwner {
        EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).deposit(_msgSender(), _orderId, _token, _tokenAmount);
    }

    function placeSellOrder(uint256 _orderId, LibOrder.AssetData memory _asset, uint256 _assetAmount) external onlyOwner {
        EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), _orderId, _assetAmount, _asset);
    }

    function executeBuyOrder(uint256[] calldata _orderIds, uint256[] calldata _paymentPerOrder, uint256[] calldata _amounts, LibOrder.AssetData calldata _asset) 
        external onlyOwner
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Send Assets to user
            EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), _orderIds[i], _amounts[i], _asset);
            
            // send payment to escrow as claimable per order
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(_msgSender(), _orderIds[i], _paymentPerOrder[i]);
        }

    }

    // Send assets from escrow to user, send tokens from user to escrow
    function executeSellOrder(uint256[] calldata _orderIds, uint256[] calldata _paymentPerOrder, uint256[] calldata _amounts, address _token)
        external onlyOwner 
    {
        require(_orderIds.length == _paymentPerOrder.length && _orderIds.length == _amounts.length, "Invalid input lenght");
        
        // send payment to escrow as claimable per order
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).deposit(_msgSender(), _orderIds[i], _token, _paymentPerOrder[i]);
        }

        // send asset to buyer
        EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdrawBatch(_msgSender(), _orderIds, _amounts);
    }

    function deleteOrder(uint256 _orderId) external onlyOwner {
        LibOrder.OrderData memory order = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderId);
        if (order.isBuyOrder) {
            // withdraw ERC20            
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(
                _msgSender(),
                _orderId,
                SafeMathUpgradeable.mul(order.price, order.amount));
        } else {
            // withdraw NFTs
            EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), _orderId, order.amount);
        }
    }

    function claimOrders(uint256[] calldata _orderIds) external onlyOwner {
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            order = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(_orderIds[i]);
            require(order.owner == _msgSender(), "User doesn't own this order");
            if (order.isBuyOrder) {
                // withdraw NFTs
                amount = EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).escrowedAssetsByOrder(_orderIds[i]);
                EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), _orderIds[i], amount);
            } else {
                // withdraw ERC20               
                amount = EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).escrowedTokensByOrder(_orderIds[i]);
                EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(
                    _msgSender(),
                    _orderIds[i],
                    amount);
            }
        }
    }

    // function getTokensEscrowAddress() external onlyOwner returns(address) {
    //     returns _getRegistry().getAddress(ESCROW_ERC20_CONTRACT);
    // }

    /**************** Internal Functions ****************/

    // function verifyOrders(uint256[] memory orderIds, LibOrder.AssetData memory asset, address tokenAddr, bool isBuyOrder) external view onlyOwner returns (bool) {
    //     return OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).verifyOrders(
    //             orderIds,
    //             asset,
    //             tokenAddr,
    //             isBuyOrder);
    // }

    // function fillOrders(uint256[] memory orderIds, uint256[] memory amounts) external onlyOwner {
    //     // If we get to this point, the orders in the list of order ids have already been verified.
    //     require(orderIds.length != amounts.length, "Orderbook Contract is not yet set");

    //     // the caller will already fill in the orders up to the amount. 
    //     for (uint256 i = 0; i < orderIds.length; ++i) {
    //         OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).fillOrder(orderIds[i], amounts[i]);
    //     }
    // }

    // function deleteOrder(uint256 orderId) internal {
    //     // If we get to this point, the orders in the list of order ids have already been verified.
    //     // the caller will already fill in the orders up to the amount. 
    //     OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).deleteOrder(orderId);
    // }
    
    uint256[50] private __gap;
}