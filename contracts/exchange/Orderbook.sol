// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ManagerBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbook.sol";
import "../utils/LibContractHash.sol";

contract Orderbook is IOrderbook, ManagerBase {
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) orders;
    uint256 internal orderIdCounter;

    /******************** Public API ********************/
    function __Orderbook_init(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        _registerInterface(LibInterfaces.INTERFACE_ID_ORDERBOOK);
        orderIdCounter = 0;
    }

    /**************** External Functions ****************/
    function placeOrder(LibOrder.OrderData memory _order) external override onlyOwner returns(uint256 id){
        id = _generateOrderId(_order.owner, _order.asset.contentAddress, _order.asset.tokenId, orderIdCounter++);
        orders[id] = _order;
    }

    function verifyOrders(
        uint256[] memory _orderIds,
        LibOrder.AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder
    ) external view override onlyOwner returns (bool) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (!LibOrder._verifyOrders(orders[_orderIds[i]], _asset, _token, _isBuyOrder)) {
                return false;
            }
        }
        return true;
    }

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view override onlyOwner returns(uint256 amountDue, uint256[] memory amountPerOrder) {
        require(_orderIds.length == _amounts.length, "Invalid Length");

        amountPerOrder = new uint256[](_amounts.length);
        amountDue = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(orders[_orderIds[i]].amount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            
            amountPerOrder[i] = orders[_orderIds[i]].price * _amounts[i];
            amountDue = amountDue + amountPerOrder[i];
        }
    } 

    function fillOrders(uint256[] memory _orderIds, uint256[] memory _amounts) external override onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        require(_orderIds.length == _amounts.length, "Invalid input lengths");

        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            orders[_orderIds[i]].amount = orders[_orderIds[i]].amount - _amounts[i];
        }
    }

    function deleteOrder(uint256 _orderId, address _owner) external override onlyOwner {
        // If we get to this point, the orders in the list of order ids have already been verified.
        // the caller will already fill in the orders up to the amount. 
        require(
            orders[_orderId].owner == _owner,
            "Invalid order owner."
        );

        // Deleting costs 5000, but returns a 15000 gas refund at the end of your call, which will make
        // the overall transaction cheaper, I think.
        delete orders[_orderId];
    }

    function getOrder(uint256 _orderId) external view override returns(LibOrder.OrderData memory) {
        return orders[_orderId];
    }

    function exists(uint256 _orderId) external view override returns(bool){
        return orders[_orderId].owner != address(0);
    }
    
    /**************** Internal Functions ****************/
    function _generateOrderId(address _user, address _tokenAddr, uint256 _tokenId, uint256 _orderIdCounter) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_user, _tokenAddr, _tokenId, _orderIdCounter)));
    }
    
    uint256[50] private __gap;
}