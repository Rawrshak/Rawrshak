// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./EscrowERC20.sol";
import "../content/Content.sol";
import "./LibOrder.sol";
import "./RoyaltyManager.sol";
import "./OrderbookManager.sol";
import "./ExecutionManager.sol";

// Todo: 
//      1. Add more events
//      2. Contracts need to register an interface.
//      3. Figure out who does the actual input checking
//      4. Need to deduct royalties from total payment
//      5. contract size too big. Need to further make the infrastructure more bite-sized.

contract Exchange is OwnableUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    RoyaltyManager royaltyManager;
    OrderbookManager orderbookManager;
    ExecutionManager executionManager;


    /***************** Stored Variables *****************/
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Exchange_init(address _royaltyManager, address _orderbookManager, address _executionManager) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        // __Orderbook_init_unchained();
        // __RoyaltyManagement_init_unchained(); 
        // __ExchangeBase_init_unchained(_registry);
        royaltyManager = RoyaltyManager(_royaltyManager);
        orderbookManager = OrderbookManager(_orderbookManager);
        executionManager = ExecutionManager(_executionManager);
    }

    // exchange functions
    function placeOrder(LibOrder.OrderData memory _order) external {        
        require(_order.owner == _msgSender(), "Invalid sender.");
        require(_order.tokenAddr != address(0) || 
                _order.asset.contentAddress != address(0),
                "Invalid Address.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");

        // place order in orderbook
        uint256 id = orderbookManager.placeOrder(_order);

        if (_order.isBuyOrder) {
            // if it's a buy order, move tokens to ERC20 escrow.
            uint256 tokenAmount = SafeMathUpgradeable.mul(_order.amount, _order.price);
            executionManager.placeBuyOrder(id, _order.tokenAddr, tokenAmount);
        } else {
            // if it's a sell order, move NFT to escrow
            executionManager.placeSellOrder(id, _order.asset, _order.amount);
        }
    }

    // Buy order: someone wants to buy assets. 
    // Fill Buy Order: money goes from escrow to user
    //           assets go from user to escrow
    function fillBuyOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts,
        LibOrder.AssetData memory _asset,
        address _token) external {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
        require(_token.isContract(), "Invalid token address.");
        require(_asset.contentAddress.isContract(), "Invalid asset parameter.");
        require(_asset.contentAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        require(orderbookManager.verifyOrders(_orderIds, _asset, _token, false), "Invalid input");

        // Get Total Payment
        (, uint256[] memory amountPerOrder) = orderbookManager.getPaymentTotals(_orderIds, _amounts);
        
        // Get Total Assets to sell
        uint256 totalAssetsToSell = 0;
        for (uint256 i = 0; i < _amounts.length; ++i) {
            totalAssetsToSell = SafeMathUpgradeable.add(totalAssetsToSell, _amounts[i]);
        }

        // Verify that the buyer has these NFTs
        require(Content(_asset.contentAddress).balanceOf(_msgSender(), _asset.tokenId) >= totalAssetsToSell, "Not enough assets.");

        // Storage->fill buy order
        orderbookManager.fillOrders(_orderIds, _amounts);

        // Deduct royalties from escrow
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            amountPerOrder[i] = royaltyManager.deductRoyaltiesFromEscrow(_orderIds[i], _token, _asset, amountPerOrder[i]);
        }

        // Execute trade
        executionManager.executeBuyOrder(_orderIds, amountPerOrder, _amounts, _asset);
        // emit BuyOrdersFilled();
    }

    // Sell order: someone has assets to get rid of
    // Fill Sell Order: money goes from user to escrow
    //           assets go from escrow to user
    //          User is a buyer
    //          Escrow is the seller
    function fillSellOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts,
        LibOrder.AssetData memory _asset,
        address _token) external {
        // Check Input
        // validate orders
        //  - make sure all same asset
        //  - make sure below max price
        // Todo: might have to cut this down later
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
        require(_token.isContract(), "Invalid token address.");
        require(_asset.contentAddress.isContract(), "Invalid asset parameter.");
        require(_asset.contentAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        require(orderbookManager.verifyOrders(_orderIds, _asset, _token, true), "Invalid input");

        // Get Total Payment
        (uint256 amountDue, uint256[] memory amountPerOrder) = orderbookManager.getPaymentTotals(_orderIds, _amounts);
        
        // check buyer's account balance
        require(IERC20Upgradeable(_token).balanceOf(_msgSender()) >= amountDue, "Not enough funds.");

        // Storage->fill buy order
        orderbookManager.fillOrders(_orderIds, _amounts);

        // Deduct royalties
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            amountPerOrder[i] = royaltyManager.deductRoyaltiesFromUser(_orderIds[i], _msgSender(), _token, _asset, amountPerOrder[i]);
        }

        // Execute trade
        executionManager.executeSellOrder(_orderIds, amountPerOrder, _amounts, _token);
        // emit SellOrdersFilled();
    }

    function deleteOrders(uint256 _orderId) external {
        // delete orders
        orderbookManager.deleteOrder(_orderId);

        executionManager.deleteOrder(_orderId);
        // todo: emit Deleted Orders (orderIds)
    }

    function getOrder(uint256 id) external view returns (LibOrder.OrderData memory) {
        return orderbookManager.getOrder(id);
    }

    function claim(uint256[] memory orderIds) external {
        require(orderIds.length > 0, "empty order length.");
        
        executionManager.claimOrders(orderIds);
        // todo: emit claim order
    }

    // royalty functions
    function setPlatformFees(LibRoyalties.Fees[] memory newFees) external onlyOwner {
        require(newFees.length > 0, "Invalid fees.");
        
        royaltyManager.setPlatformFees(newFees);
    }

    function getDistributionsAmount(address token) external view returns (uint256) {
        require(token != address(0), "Invalid address");
        return royaltyManager.getDistributionsAmount(_msgSender(), token);
    }

    function claimRoyalties(address token) external {
        require(token != address(0), "Invalid address");
        royaltyManager.claimRoyalties(_msgSender(), token);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}