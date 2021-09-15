// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../exchange/Orderbook.sol";

contract TestOrderbook is Orderbook {

    function __TestOrderbook_init(address _resolver) external initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ManagerBase_init_unchained(_resolver);
        _registerInterface(LibInterfaces.INTERFACE_ID_ORDERBOOK);
        orderIdCounter = 0;
    }

    function getId(LibOrder.OrderData memory _order) public view returns(uint256 id) {
        return _generateOrderId(_order.owner, _order.asset.contentAddress, _order.asset.tokenId, orderIdCounter-1);
    }
}