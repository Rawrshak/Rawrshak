// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IExchange {
    
    /******** View Functions ********/

    function getOrder(uint256 id) external view returns (LibOrder.Order memory);

    function tokenEscrow() external view returns(address);

    function nftsEscrow() external view returns(address);

    function claimableRoyalties() external view returns (address[] memory tokens, uint256[] memory amounts);
    
    /******** Mutative Functions ********/
    function placeOrder(LibOrder.OrderInput memory _order) external; 
    
    function fillBuyOrder(
        uint256[] memory _orderIds,
        uint256 amountToSell,
        uint256 maxSpend
    ) external;

    function fillSellOrder(
        uint256[] memory _orderIds,
        uint256 amountToBuy,
        uint256 maxSpend
    ) external;

    function cancelOrders(uint256[] memory _orderIds) external;

    function claimOrders(uint256[] memory _orderIds) external;

    function claimRoyalties() external;

    function addSupportedToken(address _token) external;

    /*********************** Events *********************/
    event OrderPlaced(address indexed from, uint256 indexed orderId, LibOrder.OrderInput order);

    event OrdersFilled(
        address indexed from,
        uint256[] orderIds,
        uint256[] amounts,
        LibOrder.AssetData asset,
        address token,
        uint256 totalAssetsAmount,
        uint256 volume);

    event OrdersDeleted(address indexed owner, uint256[] orderIds);
    
    event OrdersClaimed(address indexed owner, uint256[] orderIds);
    
}