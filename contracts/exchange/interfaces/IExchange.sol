// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../libraries/LibOrder.sol";

interface IExchange {
    
    /******** View Functions ********/

    function getOrder(uint256 id) external view returns (LibOrder.OrderData memory);

    function tokenEscrow() external view returns(address);

    function nftsEscrow() external view returns(address);

    function claimableRoyalties() external view returns (address[] memory tokens, uint256[] memory amounts);
    
    /******** Mutative Functions ********/
    function placeOrder(LibOrder.OrderData memory _order) external; 
    
    function fillBuyOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts
    ) external;

    function fillSellOrder(
        uint256[] memory _orderIds,
        uint256[] memory _amounts
    ) external;

    function deleteOrder(uint256 _orderId) external;

    function claimOrders(uint256[] memory orderIds) external;

    function claimRoyalties() external;

    function addSupportedToken(address _token) external;

    /*********************** Events *********************/
    event OrderPlaced(address indexed from, uint256 indexed orderId, LibOrder.OrderData order);

    event BuyOrdersFilled(
        address indexed from,
        uint256[] orderIds,
        uint256[] amounts,
        LibOrder.AssetData asset,
        address token,
        uint256 amountOfAssetsSold);

    event SellOrdersFilled(
        address indexed from,
        uint256[] orderIds,
        uint256[] amounts,
        LibOrder.AssetData asset,
        address token,
        uint256 amountPaid);
        
    event OrderDeleted(address indexed owner, uint256 orderId);
    
    event FilledOrdersClaimed(address indexed owner, uint256[] orderIds);
    
}