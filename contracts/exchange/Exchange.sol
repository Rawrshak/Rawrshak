// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IOrderbook.sol";
import "./interfaces/IExecutionManager.sol";
import "./interfaces/IExchange.sol";

contract Exchange is IExchange, ContextUpgradeable, OwnableUpgradeable, ERC165StorageUpgradeable {    
    /***************** Stored Variables *****************/
    IRoyaltyManager royaltyManager;
    IOrderbook orderbook;
    IExecutionManager executionManager;

    /******************** Public API ********************/
    function __Exchange_init(address _royaltyManager, address _orderbook, address _executionManager) public initializer {
        // We don't run the interface checks because we're the only one who will deploy this so
        // we know that the addresses are correct
        __Context_init_unchained();
        __Ownable_init_unchained();
        __Exchange_init_unchained(_royaltyManager, _orderbook, _executionManager);
    }

    function __Exchange_init_unchained(address _royaltyManager, address _orderbook, address _executionManager) internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_EXCHANGE);
          
        royaltyManager = IRoyaltyManager(_royaltyManager);
        orderbook = IOrderbook(_orderbook);
        executionManager = IExecutionManager(_executionManager);
    }

    // exchange functions
    function placeOrder(LibOrder.OrderInput memory _order) external override {        
        LibOrder.verifyOrderInput(_order, _msgSender());
        require(executionManager.verifyToken(_order.token), "Token is not supported.");

        // Note: not checking for token id validity. If Id doesn't exist and the user places 
        // a buy order, it will escrow the tokens until the user cancels the order. If the user
        // creates a sell order for an invalid id, the transaction will fail due to invalid 
        // asset transfer to escrow. The UI should not allow either, but if someone interacts
        // with the smart contract, these two outcomes are fine.
        
        // place order in orderbook
        uint256 id = orderbook.placeOrder(_order);

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
        uint256[] memory _amounts
    ) external override {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");

        // Verify orders exist
        require(orderbook.verifyOrdersExist(_orderIds), "Non-existent order");

        // Verify all orders are of the same asset and the same token payment
        require(orderbook.verifyAllOrdersData(_orderIds, true), "Invalid order data");

        // Verify orders are still valid (ready or partially filled) 
        require(orderbook.verifyOrdersReady(_orderIds), "An order has been filled");
        
        // Get Total Payment
        (, uint256[] memory amountPerOrder) = orderbook.getPaymentTotals(_orderIds, _amounts);
        
        // Get Total Assets to sell
        uint256 totalAssetsToSell = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            totalAssetsToSell = totalAssetsToSell + _amounts[i];
        }

        // Get Orderbook data
        LibOrder.Order memory order = orderbook.getOrder(_orderIds[0]);

        // Orderbook -> fill buy order
        orderbook.fillOrders(_orderIds, _amounts);

        // Deduct royalties from escrow per order and transfer to claimable in escrow
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            (address[] memory creators,
             uint256[] memory creatorRoyaltyFees,
             uint256 remaining) = royaltyManager.payableRoyalties(order.asset, amountPerOrder[i]);
            
            royaltyManager.transferRoyalty(_orderIds[i], creators, creatorRoyaltyFees);
            royaltyManager.transferPlatformFees(order.token, _orderIds[i], amountPerOrder[i]);
            amountPerOrder[i] = remaining;
        }

        // Update Escrow records for the orders - will revert if the user doesn't have enough assets
        executionManager.executeBuyOrder(_msgSender(), _orderIds, amountPerOrder, _amounts, order.asset);

        emit BuyOrdersFilled(_msgSender(), _orderIds, _amounts, order.asset, order.token, totalAssetsToSell);
    }

    function fillSellOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts
    ) external override {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");

        // Verify orders exist
        require(orderbook.verifyOrdersExist(_orderIds), "Non-existent order");

        // Verify all orders are of the same asset and the same token payment
        require(orderbook.verifyAllOrdersData(_orderIds, false), "Invalid order data");

        // Verify orders are still valid (ready or partially filled) 
        require(orderbook.verifyOrdersReady(_orderIds), "An order has been filled");

        // Get Total Payment
        (uint256 amountDue, uint256[] memory amountPerOrder) = orderbook.getPaymentTotals(_orderIds, _amounts);
        
        // get the order data
        LibOrder.Order memory order = orderbook.getOrder(_orderIds[0]);

        // Orderbook -> fill sell order
        orderbook.fillOrders(_orderIds, _amounts);

        // Deduct royalties
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            (address[] memory creators,
             uint256[] memory creatorRoyaltyFees,
             uint256 remaining) = royaltyManager.payableRoyalties(order.asset, amountPerOrder[i]);

            // for each order, update the royalty table for each creator to get paid
            royaltyManager.depositRoyalty(_msgSender(), order.token, creators, creatorRoyaltyFees);
            royaltyManager.depositPlatformFees(_msgSender(), order.token, amountPerOrder[i]);
            amountPerOrder[i] = remaining;
        }

        // Execute trade - will revert if buyer doesn't have enough funds
        executionManager.executeSellOrder(_msgSender(), _orderIds, amountPerOrder, _amounts, order.token);

        emit SellOrdersFilled(_msgSender(), _orderIds, _amounts, order.asset, order.token, amountDue);
    }

    function cancelOrders(uint256[] memory _orderIds) external override {
        require(_orderIds.length > 0, "empty order length.");
        
        require(orderbook.verifyOrdersExist(_orderIds), "Order does not exist");
        require(orderbook.verifyOrderOwners(_orderIds, _msgSender()), "Order is not owned by claimer");
        require(orderbook.verifyOrdersReady(_orderIds), "Filled/Cancelled Orders cannot be canceled.");

        // Escrows have built in reentrancy guards so doing withdraws before deleting the order is fine.
        executionManager.cancelOrders(_orderIds);

        orderbook.cancelOrders(_orderIds);

        emit OrdersDeleted(_msgSender(), _orderIds);
    }

    function claimOrders(uint256[] memory _orderIds) external override {
        require(_orderIds.length > 0, "empty order length.");
        
        require(orderbook.verifyOrdersExist(_orderIds), "Order does not exist");
        require(orderbook.verifyOrderOwners(_orderIds, _msgSender()), "Order is not owned by claimer");

        orderbook.claimOrders(_orderIds);
        executionManager.claimOrders(_msgSender(), _orderIds);
        
        emit OrdersClaimed(_msgSender(), _orderIds);
    }

    function claimRoyalties() external override {
        royaltyManager.claimRoyalties(_msgSender());
    }

    function addSupportedToken(address _token) external override onlyOwner {
        executionManager.addSupportedToken(_token);
    }

    function getOrder(uint256 id) external view override returns (LibOrder.Order memory) {
        return orderbook.getOrder(id);
    }

    function tokenEscrow() external view override returns(address) {
        return executionManager.tokenEscrow();
    }

    function nftsEscrow() external view override returns(address) {
        return executionManager.nftsEscrow();
    }

    function claimableRoyalties() external view override returns (address[] memory tokens, uint256[] memory amounts) {
        return royaltyManager.claimableRoyalties(_msgSender());
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}