// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./EscrowERC20.sol";
import "../content/Content.sol";
import "./LibOrder.sol";
import "./interfaces/IRoyaltyManager.sol";
import "./interfaces/IOrderbookManager.sol";
import "./interfaces/IExecutionManager.sol";

// Todo: 
//      1. Add more events
//      2. Contracts need to register an interface.
//      3. Figure out who does the actual input checking
//[Done]4. Need to deduct royalties from total payment
//[Done]5. contract size too big. Need to further make the infrastructure more bite-sized.
//      6. Need to write an approval manager to allow users to set the default approvals for these
//         operator contracts manually or automatically. This will be used for the Exchange, Crafting,
//         and Lootbox contracts

contract Exchange is OwnableUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/

    /***************** Stored Variables *****************/
    IRoyaltyManager royaltyManager;
    IOrderbookManager orderbookManager;
    IExecutionManager executionManager;

    /*********************** Events *********************/
    event OrderPlaced(uint256 orderId, LibOrder.OrderData order);
    event BuyOrdersFilled(
        uint256[] _orderIds,
        uint256[] _amounts,
        LibOrder.AssetData _asset,
        bytes4 _token,
        uint256 amountOfAssetsSold);
    event SellOrdersFilled(
        uint256[] _orderIds,
        uint256[] _amounts,
        LibOrder.AssetData _asset,
        bytes4 _token,
        uint256 amountPaid);
    event OrderDeleted(uint256 orderId);
    event FilledOrdersClaimed(uint256[] orderIds);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Exchange_init(address _royaltyManager, address _orderbookManager, address _executionManager) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        require(
            _royaltyManager != address(0) && _orderbookManager != address(0) && _executionManager != address(0),
            "Address cannot be empty."
        );
        royaltyManager = IRoyaltyManager(_royaltyManager);
        orderbookManager = IOrderbookManager(_orderbookManager);
        executionManager = IExecutionManager(_executionManager);
    }

    // exchange functions
    function placeOrder(LibOrder.OrderData memory _order) external {        
        require(_order.owner == _msgSender(), "Invalid sender.");
        require(_order.asset.contentAddress != address(0),
                "Invalid Address.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");

        // place order in orderbook
        uint256 id = orderbookManager.placeOrder(_order);

        if (_order.isBuyOrder) {
            // if it's a buy order, move tokens to ERC20 escrow.
            uint256 tokenAmount = SafeMathUpgradeable.mul(_order.amount, _order.price);
            executionManager.placeBuyOrder(id, _order.token, tokenAmount);
        } else {
            // if it's a sell order, move NFT to escrow
            executionManager.placeSellOrder(id, _order.asset, _order.amount);
        }

        emit OrderPlaced(id, _order);
    }

    // Buy order: someone wants to buy assets. 
    // Fill Buy Order: money goes from escrow to user
    //           assets go from user to escrow
    function fillBuyOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts,
        LibOrder.AssetData memory _asset,
        bytes4 _token
    ) external {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
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
        executionManager.executeBuyOrder(_orderIds, amountPerOrder, _amounts, _asset, _token);
        emit BuyOrdersFilled(_orderIds, _amounts, _asset, _token, totalAssetsToSell);
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
        bytes4 _token
    ) external {
        require(_orderIds.length > 0 && _orderIds.length == _amounts.length, "Invalid order length");
        require(_asset.contentAddress.isContract(), "Invalid asset parameter.");
        require(_asset.contentAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Address is not a Content Contract");
        require(orderbookManager.verifyOrders(_orderIds, _asset, _token, true), "Invalid input");

        // Get Total Payment
        (uint256 amountDue, uint256[] memory amountPerOrder) = orderbookManager.getPaymentTotals(_orderIds, _amounts);
        
        // check buyer's account balance
        require(executionManager.verifyUserBalance(_token, amountDue), "Not enough funds.");

        // Storage->fill buy order
        orderbookManager.fillOrders(_orderIds, _amounts);

        // Deduct royalties
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            amountPerOrder[i] = royaltyManager.deductRoyaltiesFromUser(_orderIds[i], _msgSender(), _token, _asset, amountPerOrder[i]);
        }

        // Execute trade
        executionManager.executeSellOrder(_orderIds, amountPerOrder, _amounts, _token);
        emit SellOrdersFilled(_orderIds, _amounts, _asset, _token, amountDue);
    }

    function deleteOrders(uint256 _orderId) external {
        // delete orders
        orderbookManager.deleteOrder(_orderId);

        executionManager.deleteOrder(_orderId);
        emit OrderDeleted(_orderId);
    }

    function getOrder(uint256 id) external view returns (LibOrder.OrderData memory) {
        return orderbookManager.getOrder(id);
    }

    function claim(uint256[] memory orderIds) external {
        require(orderIds.length > 0, "empty order length.");
        
        executionManager.claimOrders(orderIds);
        emit FilledOrdersClaimed(orderIds);
    }

    // royalty functions
    function setPlatformFees(LibRoyalties.Fees[] memory newFees) external onlyOwner {
        require(newFees.length > 0, "Invalid fees.");
        
        royaltyManager.setPlatformFees(newFees);
    }

    function getDistributionsAmount(bytes4 _token) external view returns (uint256) {
        return royaltyManager.getDistributionsAmount(_msgSender(), _token);
    }

    function claimRoyalties(bytes4 _token) external {
        royaltyManager.claimRoyalties(_msgSender(), _token);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}