// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

library LibOrder {

    struct AssetData {
        address contentAddress;
        uint256 tokenId;
    }

    struct OrderData {
        AssetData asset;
        address owner;
        address tokenAddr;
        uint256 price;
        uint256 amount;
        bool isBuyOrder;
    }

    function _verifyOrders(
        OrderData storage order,
        AssetData memory asset,
        address tokenAddr,
        uint256 maxPrice,
        bool isBuyOrder) public view returns (bool) {
        if (order.asset.contentAddress == asset.contentAddress &&
            order.asset.tokenId == asset.tokenId && 
            order.tokenAddr == tokenAddr &&
            order.price <= maxPrice &&
            order.isBuyOrder == isBuyOrder) {
                return true;
            }
        return false;
    }

}