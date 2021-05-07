// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../utils/LibConstants.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";


library LibOrder {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

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

    function verifyOrderData(OrderData calldata _order, address _sender) public view {
        require(_order.owner == _sender, "Invalid sender.");
        require(_order.price > 0 && _order.amount > 0, "Invalid input price or amount");
        verifyAssetData(_order.asset);
    }

    function verifyAssetData(AssetData calldata _asset) public view {
        require(_asset.contentAddress != address(0),"Invalid Address.");
        require(_asset.contentAddress.isContract(), "Invalid asset parameter.");
        require(
            (_asset.contentAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT)) || 
            (_asset.contentAddress.supportsInterface(LibConstants._INTERFACE_ID_UNIQUE_CONTENT)),
            "Invalid contract interface.");
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