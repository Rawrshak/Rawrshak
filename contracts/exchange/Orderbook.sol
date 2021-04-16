// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./ExchangeBase.sol";
import "./OrderbookStorage.sol";
import "./LibOrder.sol";

abstract contract Orderbook is ExchangeBase {
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    uint256 orderIdCounter;

    /*********************** Events *********************/
    event OrderPlaced(uint256 id, LibOrder.OrderData order);
    event OrdersFilled(LibOrder.AssetData asset, uint256[] orderIds, address tokenAddr, uint256 totalAmount);

    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Orderbook_init() public initializer {
        orderIdCounter = 0;
    }

    function placeOrder(LibOrder.OrderData memory _order) external {
        require(_order.owner == _msgSender(), "Invalid sender.");
        require(_order.owner != address(0) || 
                _order.tokenAddr != address(0) || 
                _order.asset.contentAddress != address(0),
                "Invalid Address.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");
        
        uint256 id = _generateOrderId(_msgSender(), _order.asset.contentAddress, _order.asset.tokenId);

        OrderbookStorage(contracts[ORDERBOOK_STORAGE_CONTRACT]).placeOrder(id, _order);
        emit OrderPlaced(id, _order);
    }

    function fillBuyOrders(uint256 amount, uint256[] memory orderIds, LibOrder.AssetData memory asset, address tokenAddr, uint256 maxPrice) external {
        // check if order[asset] == asset
        // check amount > 0
        // check order[tokenAddr] == tokenAddr
        // check order[price] <= maxPrice
        // check order[isBuyOrder] == true

        // Get total price, check if user can pay for it
        // if they can pay for it, distribute the tokens to the owners in escrow
        // escrow.transfer() for each order
        // claim batch();
    }

    /**************** Internal Functions ****************/

    // Todo: here
    // function _verifyAsset
    
    function _generateOrderId(address _user, address _tokenAddr, uint256 _tokenId) internal returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_user, _tokenAddr, _tokenId, orderIdCounter++)));
    }
}