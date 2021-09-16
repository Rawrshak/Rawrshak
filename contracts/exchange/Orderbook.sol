// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ManagerBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbook.sol";
import "../utils/LibContractHash.sol";

contract Orderbook is IOrderbook, ManagerBase {
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.OrderData) orders;
    uint256 public override ordersLength;

    /******************** Public API ********************/
    function __Orderbook_init(address _resolver) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        __Orderbook_init_unchained();
    }

    function __Orderbook_init_unchained() internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_ORDERBOOK);
        ordersLength = 0;
    }

    /**************** External Functions ****************/
    function placeOrder(LibOrder.OrderData memory _order) external override onlyOwner returns(uint256 id){
        id = ordersLength++;
        orders[id] = _order;
    }

    function fillOrders(uint256[] memory _orderIds, uint256[] memory _amounts) external override onlyOwner {
        // The Exchange contract should have already checked the matching lengths of the parameters.
        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // This will revert if amount is greater than the order amount. This will automatically revert
            orders[_orderIds[i]].amount = orders[_orderIds[i]].amount - _amounts[i];
        }
    }

    function cancelOrders(uint256[] memory _orderIds) external override onlyOwner {
        // Deleting costs 5000, but returns a 15000 gas refund at the end of your call, which will make
        // the overall transaction cheaper, I think.
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            delete orders[_orderIds[i]];
        }
    }
    
    function cancelOrder(uint256 _orderId) external override onlyOwner {
        delete orders[_orderId];
    }

    function verifyOrdersExist(
        uint256[] memory _orderIds
    ) external view override onlyOwner returns (bool) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (!exists(_orderIds[i]) ) {
                return false;
            }
        }
        return true;
    }

    function verifyAllOrdersData(
        uint256[] memory _orderIds,
        bool _isBuyOrder
    ) external view override onlyOwner returns (bool) {
        LibOrder.OrderData memory firstOrder = orders[_orderIds[0]];
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (orders[_orderIds[i]].asset.contentAddress != firstOrder.asset.contentAddress || 
                orders[_orderIds[i]].asset.tokenId != firstOrder.asset.tokenId ||
                orders[_orderIds[i]].token != firstOrder.token ||
                orders[_orderIds[i]].isBuyOrder != _isBuyOrder) {
                return false;
            }
        }
        return true;
    }

    function verifyOrderOwners(
        uint256[] memory _orderIds,
        address _owner
    ) external view override onlyOwner returns (bool) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (orders[_orderIds[i]].owner != _owner) {
                return false;
            }
        }
        return true;
    }

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view override onlyOwner returns(uint256 amountDue, uint256[] memory amountPerOrder) {
        // The Exchange contract should have already checked the matching lengths of the parameters.
        amountPerOrder = new uint256[](_amounts.length);
        amountDue = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(orders[_orderIds[i]].amount >= _amounts[i], "Order doesn't have enough escrowed inventory. invalid amount.");
            
            amountPerOrder[i] = orders[_orderIds[i]].price * _amounts[i];
            amountDue = amountDue + amountPerOrder[i];
        }
    } 

    function getOrder(uint256 _orderId) external view override returns(LibOrder.OrderData memory) {
        return orders[_orderId];
    }

    function exists(uint256 _orderId) public view override returns(bool){
        return orders[_orderId].owner != address(0);
    }
    
    uint256[50] private __gap;
}