// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../exchange/OrderbookManager.sol";

contract TestOrderbookManager is OrderbookManager {

    function __TestOrderbookManager_init(address _registry) external initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_registry);
        _registerInterface(LibConstants._INTERFACE_ID_ORDERBOOK_MANAGER);
        orderIdCounter = 0;
    }

    function getId(LibOrder.OrderData memory _order) public view returns(uint256 id) {
        return _generateOrderId(_order.owner, _order.asset.contentAddress, _order.asset.tokenId, orderIdCounter-1);
    }
}