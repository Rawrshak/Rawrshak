// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./EscrowERC20.sol";
import "../content/Content.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IOrderbookManager.sol";
import "./interfaces/IExecutionManager.sol";

contract Exchange is ContextUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /***************** Stored Variables *****************/
    IRoyaltyManager royaltyManager;
    IOrderbookManager orderbookManager;
    IExecutionManager executionManager;

    /*********************** Events *********************/
    event OrderPlaced(address indexed from, uint256 indexed orderId, LibOrder.OrderData order);
    event BuyOrdersFilled(
        address indexed from,
        uint256[] orderIds,
        uint256[] amounts,
        LibOrder.AssetData asset,
        bytes4 token,
        uint256 amountOfAssetsSold);
    event SellOrdersFilled(
        address indexed from,
        uint256[] orderIds,
        uint256[] amounts,
        LibOrder.AssetData asset,
        bytes4 token,
        uint256 amountPaid);
    event OrderDeleted(address indexed owner, uint256 orderId);
    event FilledOrdersClaimed(address indexed owner, uint256[] orderIds);

    /******************** Public API ********************/
    function __Exchange_init(address _royaltyManager, address _orderbookManager, address _executionManager) public initializer {
        __Context_init_unchained();
        require(
            _royaltyManager != address(0) && _orderbookManager != address(0) && _executionManager != address(0),
            "Address cannot be empty."
        );
        require(_royaltyManager.supportsInterface(LibInterfaces.INTERFACE_ID_ROYALTY_MANAGER), "Invalid manager interface.");
        require(_orderbookManager.supportsInterface(LibInterfaces.INTERFACE_ID_ORDERBOOK_MANAGER), "Invalid manager interface.");
        require(_executionManager.supportsInterface(LibInterfaces.INTERFACE_ID_EXECUTION_MANAGER), "Invalid manager interface.");
        
        royaltyManager = IRoyaltyManager(_royaltyManager);
        orderbookManager = IOrderbookManager(_orderbookManager);
        executionManager = IExecutionManager(_executionManager);
        _registerInterface(LibInterfaces.INTERFACE_ID_EXCHANGE);
    }

    // exchange functions
    function placeOrder(LibOrder.OrderData memory _order) external {        
        LibOrder.verifyOrderData(_order, _msgSender());
        require(executionManager.verifyToken(_order.token), "Token is not supported.");

        // place order in orderbook
        uint256 id = orderbookManager.placeOrder(_order);

        if (_order.isBuyOrder) {
            // if it's a buy order, move tokens to ERC20 escrow.
            uint256 tokenAmount = _order.amount * _order.price;
            executionManager.placeBuyOrder(id, _order.token, _msgSender(), tokenAmount);
        } else {
            // if it's a sell order, move NFT to escrow
            executionManager.placeSellOrder(id, _msgSender(), _order.asset, _order.amount);            
        }

        emit OrderPlaced(_msgSender(), id, _order);
    }

    function fillBuyOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts,
        LibOrder.AssetData memory _asset,
        bytes4 _token
    ) external {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
        require(executionManager.verifyToken(_token), "Token is not supported.");
        LibOrder.verifyAssetData(_asset);
        require(orderbookManager.verifyOrders(_orderIds, _asset, _token, true), "Invalid order");

        if (ERC165CheckerUpgradeable.supportsInterface(_asset.contentAddress, type(IERC721Upgradeable).interfaceId)) {
            require(_orderIds.length == 1, "Only 1 unique asset can be bought at a time.");
        }

        // Get Total Payment
        (, uint256[] memory amountPerOrder) = orderbookManager.getPaymentTotals(_orderIds, _amounts);
        
        // Get Total Assets to sell
        uint256 totalAssetsToSell = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            totalAssetsToSell = totalAssetsToSell + _amounts[i];
        }

        // Verify that the buyer has these NFTs
        require(Content(_asset.contentAddress).balanceOf(_msgSender(), _asset.tokenId) >= totalAssetsToSell, "Not enough assets.");

        // Orderbook -> fill buy order
        orderbookManager.fillOrders(_orderIds, _amounts);

        // Deduct royalties from escrow per order and transfer to claimable in escrow
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            (address[] memory accounts,
             uint256[] memory royaltyAmounts,
             uint256 remaining) = royaltyManager.getRequiredRoyalties(_asset, amountPerOrder[i]);
            
            royaltyManager.transferRoyalty(_token, _orderIds[i], accounts, royaltyAmounts);
            royaltyManager.transferPlatformRoyalty(_token, _orderIds[i], amountPerOrder[i]);
            amountPerOrder[i] = remaining;
        }

        // Update Escrow records for the orders
        executionManager.executeBuyOrder(_msgSender(), _orderIds, amountPerOrder, _amounts, _asset, _token);

        emit BuyOrdersFilled(_msgSender(), _orderIds, _amounts, _asset, _token, totalAssetsToSell);
    }

    function fillSellOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts,
        LibOrder.AssetData memory _asset,
        bytes4 _token
    ) external {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
        require(executionManager.verifyToken(_token), "Token is not supported.");
        LibOrder.verifyAssetData(_asset);
        require(orderbookManager.verifyOrders(_orderIds, _asset, _token, false), "Invalid input");

        if (ERC165CheckerUpgradeable.supportsInterface(_asset.contentAddress, type(IERC721Upgradeable).interfaceId)) {
            require(_orderIds.length == 1, "Only 1 unique asset can be bought at a time.");
        }

        // Get Total Payment
        (uint256 amountDue, uint256[] memory amountPerOrder) = orderbookManager.getPaymentTotals(_orderIds, _amounts);
        
        // check buyer's account balance
        require(executionManager.verifyUserBalance(_msgSender(), _token, amountDue), "Not enough funds.");
        
        // Get Total Assets to buy
        uint256 totalAssetsToBuy = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            totalAssetsToBuy = totalAssetsToBuy + _amounts[i];
        }

        // Orderbook -> fill sell order
        orderbookManager.fillOrders(_orderIds, _amounts);

        // Deduct royalties
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            (address[] memory accounts,
             uint256[] memory royaltyAmounts,
             uint256 remaining) = royaltyManager.getRequiredRoyalties(_asset, amountPerOrder[i]);

            // for each order, update the royalty table for each creator to get paid
            royaltyManager.depositRoyalty(_msgSender(), _token, accounts, royaltyAmounts);
            royaltyManager.depositPlatformRoyalty(_msgSender(), _token, amountPerOrder[i]);
            amountPerOrder[i] = remaining;
        }

        // Execute trade
        executionManager.executeSellOrder(_msgSender(), _orderIds, amountPerOrder, _amounts, _token);

        emit SellOrdersFilled(_msgSender(), _orderIds, _amounts, _asset, _token, amountDue);
    }

    function deleteOrders(uint256 _orderId) external {
        require(orderbookManager.orderExists(_orderId), "Invalid Order.");

        LibOrder.OrderData memory order = orderbookManager.getOrder(_orderId);
        // delete orders
        orderbookManager.deleteOrder(_orderId, _msgSender());
        
        executionManager.deleteOrder(
            _orderId,
            _msgSender(),
            order);

        emit OrderDeleted(_msgSender(), _orderId);
    }

    function getOrder(uint256 id) external view returns (LibOrder.OrderData memory) {
        return orderbookManager.getOrder(id);
    }

    function claimOrders(uint256[] memory orderIds) external {
        require(orderIds.length > 0, "empty order length.");
        
        executionManager.claimOrders(_msgSender(), orderIds);
        
        emit FilledOrdersClaimed(_msgSender(), orderIds);
    }

    function tokenEscrow(bytes4 _token) external view returns(address) {
        return executionManager.tokenEscrow(_token);
    }

    function nftsEscrow() external view returns(address) {
        return executionManager.nftsEscrow();
    }

    function claimableRoyaltyAmount(bytes4 _token) external view returns (uint256) {
        require(executionManager.verifyToken(_token), "Token is not supported.");
        return royaltyManager.claimableRoyaltyAmount(_msgSender(), _token);
    }

    function claimRoyalties(bytes4 _token) external {
        require(executionManager.verifyToken(_token), "Token is not supported.");
        royaltyManager.claimRoyalties(_msgSender(), _token);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}