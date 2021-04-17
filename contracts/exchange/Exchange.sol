// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./Orderbook.sol";
import "./RoyaltyManagement.sol";
import "./EscrowERC20.sol";
import "../content/Content.sol";

// Todo: 
//      1. Add more events
//      2. Contracts need to register an interface.
//      3. Figure out who does the actual input checking
//      4. Need to deduct royalties from total payment
//      5. contract size too big. Need to further make the infrastructure more bite-sized.

contract Exchange is Orderbook, RoyaltyManagement {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Exchange_init(address _registry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __Orderbook_init_unchained();
        __RoyaltyManagement_init_unchained(); 
        __ExchangeBase_init_unchained(_registry);
    }

    // exchange functions
    function placeOrder(LibOrder.OrderData memory _order) external {
        require(_order.owner == _msgSender(), "Invalid Order.");
        // todo: add more requires

        // create order id
        uint256 id = _generateOrderId(_msgSender(), _order.asset.contentAddress, _order.asset.tokenId);

        if (_order.isBuyOrder) {
            // if it's a buy order, move tokens to ERC20 escrow.            
            uint256 tokenAmount = SafeMathUpgradeable.mul(_order.amount, _order.price);
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).deposit(_msgSender(), id, _order.tokenAddr, tokenAmount);
        } else {
            // if it's a sell order, move NFT to escrow
            EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), id, _order.amount, _order.asset);
        }

        // place order in orderbook
        _placeOrder(id, _order);
    }

    function fillBuyOrder(
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
        require(_verifyOrders(_orderIds, _asset, _token, true), "Invalid input");

        // Get the order ids that satisfy the amount
        uint256 orderAmount = 0;
        uint256 price = 0;
        uint256 totalPayment = 0;
        uint256[] memory paymentPerOrder = new uint256[](_orderIds.length);
        for (uint i = 0; i < _orderIds.length; ++i) {
            orderAmount = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderAmount(_orderIds[i]);
            require(orderAmount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            (, price) = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderPrice(_orderIds[i]);
            
            paymentPerOrder[i] = SafeMathUpgradeable.mul(price, _amounts[i]);
            totalPayment = SafeMathUpgradeable.add(totalPayment, paymentPerOrder[i]);
        }
        
        // check buyer's account balance
        require(IERC20Upgradeable(_token).balanceOf(_msgSender()) >= totalPayment, "Not enough funds.");

        // Storage->fill buy order
        _fillOrders(_orderIds, _amounts);

        // distribute royalties
        LibRoyalties.Fees[] memory contractFees = Content(_asset.contentAddress).getRoyalties(_asset.tokenId);
        uint256 royalty = 0;
        for (uint256 i = 0; i < contractFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(totalPayment, contractFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_msgSender(), contractFees[i].account, _token, royalty);
            }
            // sellerPayment = SafeMathUpgradeable.sub(sellerPayment, royalty);
        }

        // calculate total price and add royalties from asset and platform
        for (uint256 i = 0; i < exchangeFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(totalPayment, exchangeFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_msgSender(), exchangeFees[i].account, _token, royalty);
            }
            // sellerPayment = SafeMathUpgradeable.sub(sellerPayment, royalty);
        }

        // send payment to escrow as claimable per order
        // Todo: payment per order is incorrect because it doesn't remove the royalty. Fix this
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).deposit(_msgSender(), _orderIds[i], _token, paymentPerOrder[i]);
        }

        // send asset to buyer
        EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdrawBatch(_msgSender(), _orderIds, _amounts);
    }

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
        require(_verifyOrders(_orderIds, _asset, _token, false), "Invalid input");

        // Verify that the buyer has these NFTs
        uint256 orderAmount = 0;
        uint256 price = 0;
        uint256 totalPayment = 0;
        uint256 totalAssetsToSell = 0;
        uint256[] memory paymentPerOrder = new uint256[](_orderIds.length);
        for (uint i = 0; i < _orderIds.length; ++i) {    
            orderAmount = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderAmount(_orderIds[i]);
            require(orderAmount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            (, price) = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderPrice(_orderIds[i]);

            totalAssetsToSell = SafeMathUpgradeable.add(
                totalAssetsToSell, 
                OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrderAmount(_orderIds[i]));
            paymentPerOrder[i] = SafeMathUpgradeable.mul(price, _amounts[i]);
            totalPayment = SafeMathUpgradeable.add(totalPayment, paymentPerOrder[i]);
        }
        
        // check buyer's account balance
        require(Content(_asset.contentAddress).balanceOf(_msgSender(), _asset.tokenId) >= totalAssetsToSell, "Not enough assets.");

        // Storage->fill buy order
        _fillOrders(_orderIds, _amounts);

        // distribute royalties from sell contract
        LibRoyalties.Fees[] memory contractFees = Content(_asset.contentAddress).getRoyalties(_asset.tokenId);
        uint256 royalty = 0;
        for (uint256 i = 0; i < contractFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(totalPayment, contractFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT), contractFees[i].account, _token, royalty);
            }
        }

        // calculate total price and add royalties from asset and platform
        for (uint256 i = 0; i < exchangeFees.length; ++i) {
            royalty = SafeMathUpgradeable.div(SafeMathUpgradeable.mul(totalPayment, exchangeFees[i].bps), 10000);
            if (royalty > 0) {
                _deposit(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT), exchangeFees[i].account, _token, royalty);
            }
        }


        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // send asset to escrow where seller can claim it
            EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).deposit(_msgSender(), _orderIds[i], _amounts[i], _asset);
            
            // send payment to escrow as claimable per order
            // Todo: payment per order is incorrect because it doesn't remove the royalty. Fix this
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(_msgSender(), _orderIds[i], paymentPerOrder[i]);
        }
    }

    function deleteOrders(uint256 orderId) external {
        LibOrder.OrderData memory order = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(orderId);
        require(order.owner == _msgSender(), "Invalid order owner.");
        if (order.isBuyOrder) {
            // withdraw ERC20            
            EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(
                _msgSender(),
                orderId,
                SafeMathUpgradeable.mul(order.price, order.amount));
        } else {
            // withdraw NFTs
            EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), orderId, order.amount);
        }

        // delete orders
        _deleteOrder(orderId);

        // todo: emit Deleted Orders (orderIds)
    }

    function getOrder(uint256 id) external view returns (LibOrder.OrderData memory){
        return OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(id);
    }

    function claim(uint256[] memory orderIds) external {
        require(orderIds.length > 0, "empty order length.");
        
        LibOrder.OrderData memory order;
        uint256 amount = 0;
        for (uint256 i = 0; i < orderIds.length; ++i) {
            order = OrderbookStorage(_getRegistry().getAddress(ORDERBOOK_STORAGE_CONTRACT)).getOrder(orderIds[i]);
            require(order.owner == _msgSender(), "Invalid order owner");
            if (order.isBuyOrder) {
                // withdraw NFTs
                amount = EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).escrowedAssetsByOrder(orderIds[i]);
                EscrowNFTs(_getRegistry().getAddress(ESCROW_NFTS_CONTRACT)).withdraw(_msgSender(), orderIds[i], amount);
            } else {
                // withdraw ERC20
                // todo: fix ERC20                
                amount = EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).escrowedTokensByOrder(orderIds[i]);
                EscrowERC20(_getRegistry().getAddress(ESCROW_ERC20_CONTRACT)).withdraw(
                    _msgSender(),
                    orderIds[i],
                    amount);
            }
        }
    }

    // royalty functions
    function setPlatformFees(LibRoyalties.Fees[] memory newFees) external onlyOwner {
        require(newFees.length > 0, "Invalid fees.");
        
        _setPlatformFees(newFees);
    }

    function getDistributionsAmount(address token) external view returns (uint256) {
        require(token != address(0), "Invalid address");
        return _getDistributionsAmount(_msgSender(), token);
    }

    function claimRoyalties(address token) external {
        require(token != address(0), "Invalid address");
        _claimRoyalties(_msgSender(), token);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;

}