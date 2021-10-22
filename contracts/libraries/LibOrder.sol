// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "../content/interfaces/IContent.sol";

library LibOrder {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    struct AssetData {
        address contentAddress;
        uint256 tokenId;
    }

    enum OrderState {
        READY,
        PARTIALLY_FILLED,
        FILLED,
        CLAIMED,
        CANCELLED
    }

    struct Order {
        AssetData asset;
        address owner;
        address token;
        uint256 price;
        uint256 amountOrdered;
        uint256 amountFilled;
        bool isBuyOrder;
        OrderState state;
    }

    struct OrderInput {
        AssetData asset;
        address owner;
        address token;
        uint256 price;
        uint256 amount;
        bool isBuyOrder;
    }

    function verifyOrderInput(OrderInput memory _order, address _sender) internal view {
        require(_order.owner == _sender, "Invalid sender.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");
        verifyAssetData(_order.asset);
    }

    function verifyAssetData(AssetData memory _asset) internal view {
        require(_asset.contentAddress != address(0),"Invalid Address.");
        require(_asset.contentAddress.isContract(), "Invalid asset parameter.");

        // require support for IERC1155Upgradeable
        require(
            _asset.contentAddress.supportsInterface(type(IERC1155Upgradeable).interfaceId),
            "Invalid contract interface.");
    }

    function _verifyOrders(
        OrderInput storage _order,
        AssetData memory _asset,
        address _token,
        bool _isBuyOrder) internal view returns (bool) {
        if (_order.asset.contentAddress == _asset.contentAddress &&
            _order.asset.tokenId == _asset.tokenId && 
            _order.token == _token &&
            _order.isBuyOrder == _isBuyOrder) {
                return true;
            }
        return false;
    }
}