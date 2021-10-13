// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ManagerBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IOrderbook.sol";
import "../utils/LibContractHash.sol";

contract Orderbook is IOrderbook, ManagerBase {
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.Order) orders;
    uint256 public override ordersLength;

    /******************** Public API ********************/
    function initialize(address _resolver) public initializer {
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
    function placeOrder(LibOrder.OrderInput memory _order) external override onlyOwner returns(uint256 id){
        id = ordersLength++;
        orders[id].asset = _order.asset;
        orders[id].owner = _order.owner;
        orders[id].token = _order.token;
        orders[id].price = _order.price;
        orders[id].amountOrdered = _order.amount;
        orders[id].isBuyOrder = _order.isBuyOrder;
        orders[id].state = LibOrder.OrderState.READY;

        // Note: Order.amountFilled is 0 by default
    }

    function fillOrders(uint256[] memory _orderIds, uint256[] memory _amounts) external override onlyOwner {
        // The Exchange contract should have already checked the matching lengths of the parameters.
        // the caller will already fill in the orders up to the amount. 
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // skip zero amounts
            if (_amounts[i] > 0) {
                // This will revert if amount is greater than the order amount. This will automatically revert
                orders[_orderIds[i]].amountFilled += _amounts[i];

                if (orders[_orderIds[i]].amountFilled != orders[_orderIds[i]].amountOrdered) {
                    orders[_orderIds[i]].state = LibOrder.OrderState.PARTIALLY_FILLED;
                } else {
                    orders[_orderIds[i]].state = LibOrder.OrderState.FILLED;
                }
            }
        }
    }

    function cancelOrders(uint256[] memory _orderIds) external override onlyOwner {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            require(orders[_orderIds[i]].state == LibOrder.OrderState.READY || 
                orders[_orderIds[i]].state == LibOrder.OrderState.PARTIALLY_FILLED, "Invalid order state.");

            orders[_orderIds[i]].state = LibOrder.OrderState.CANCELLED;
        }
    }
    
    function claimOrders(uint256[] memory _orderIds) external override onlyOwner {
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // If the state is Partially Filled, we don't set the order state as claimed. Claimed state 
            // only occurs for when the order is completely filled and the order owner claims.
            if (orders[i].state == LibOrder.OrderState.FILLED) {
                orders[_orderIds[i]].state = LibOrder.OrderState.CLAIMED;
            }
        }
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
        LibOrder.Order memory firstOrder = orders[_orderIds[0]];
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

    function verifyOrdersReady(uint256[] calldata _orderIds) external view override returns(bool){
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (orders[_orderIds[i]].state != LibOrder.OrderState.READY && 
                orders[_orderIds[i]].state != LibOrder.OrderState.PARTIALLY_FILLED) {
                return false;
            }
        }
        return true;
    }

    function getOrderAmounts(uint256[] calldata _orderIds) external view override returns(uint256[] memory orderAmounts) {
        orderAmounts = new uint256[](_orderIds.length); // default already at 0
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            if (orders[_orderIds[i]].state == LibOrder.OrderState.READY) {
                // If state is ready, we set the order amount correctly
                orderAmounts[i] = orders[_orderIds[i]].amountOrdered;
            } else if (orders[_orderIds[i]].state == LibOrder.OrderState.PARTIALLY_FILLED) {
                orderAmounts[i] = orders[_orderIds[i]].amountOrdered - orders[_orderIds[i]].amountFilled;
            }
        }
    }

    function getPaymentTotals(
        uint256[] calldata _orderIds,
        uint256[] calldata _amounts
    ) external view override onlyOwner returns(uint256 volume, uint256[] memory amountPerOrder) {
        // The Exchange contract should have already checked the matching lengths of the parameters.
        amountPerOrder = new uint256[](_amounts.length);
        volume = 0;
        for (uint256 i = 0; i < _orderIds.length; ++i) {
            // Only fill orders that have a non-zero amount
            if (_amounts[i] > 0) {
                amountPerOrder[i] = orders[_orderIds[i]].price * _amounts[i];
                volume = volume + amountPerOrder[i];
            }
        }
    } 

    function getOrder(uint256 _orderId) external view override returns(LibOrder.Order memory) {
        return orders[_orderId];
    }

    function exists(uint256 _orderId) public view override returns(bool){
        return orders[_orderId].owner != address(0);
    }
    
    uint256[50] private __gap;
}