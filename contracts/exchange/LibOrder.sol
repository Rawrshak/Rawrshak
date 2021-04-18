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
        bytes4 token;
        uint256 price;
        uint256 amount;
        bool isBuyOrder;
    }

    function _verifyOrders(
        OrderData storage _order,
        AssetData memory _asset,
        bytes4 _token,
        bool _isBuyOrder) public view returns (bool) {
        if (_order.asset.contentAddress == _asset.contentAddress &&
            _order.asset.tokenId == _asset.tokenId && 
            _order.token == _token &&
            _order.isBuyOrder == _isBuyOrder) {
                return true;
            }
        return false;
    }

}