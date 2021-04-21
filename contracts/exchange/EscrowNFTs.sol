// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./StorageBase.sol";
import "./LibOrder.sol";
import "./interfaces/IEscrowNFTs.sol";

contract EscrowNFTs is IEscrowNFTs, StorageBase, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for *;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.AssetData) assetData;
    mapping(uint256 => uint256) escrowedAssetsByOrder;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowNFTs_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_ESCROW_NFTS);
    }

    function getEscrowedAssetsByOrder(uint256 _orderId) external view override returns(uint256 _amount) {
        _amount = escrowedAssetsByOrder[_orderId];
    }

    function getOrderAsset(uint256 _orderId) external view override returns(LibOrder.AssetData memory _assetData) {
        _assetData = assetData[_orderId];
    }

    function deposit(
        uint256 _orderId,
        uint256 _amount,
        LibOrder.AssetData memory _assetData
    ) external override checkPermissions(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        assetData[_orderId] = _assetData;
        escrowedAssetsByOrder[_orderId] = _amount;
    }

    // withdraw() and withdrawBatch() is called when a user buys an escrowed asset, a seller cancels an order 
    // and withdraw's their escrowed asset, or a buyer's order is filled and claims the escrowed asset.
    function withdraw(
        uint256 _orderId,
        uint256 _amount
    ) external override checkPermissions(MANAGER_ROLE) {
        require(escrowedAssetsByOrder[_orderId] >= _amount, "Incorrect order amount to withdraw");
        require(assetData[_orderId].contentAddress != address(0), "Invalid Order Data");

        escrowedAssetsByOrder[_orderId] = SafeMathUpgradeable.sub(escrowedAssetsByOrder[_orderId], _amount);
    }

    function withdrawBatch(
        uint256[] memory _orderIds,
        uint256[] memory _amounts
    ) external override checkPermissions(MANAGER_ROLE) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {            
            require(escrowedAssetsByOrder[_orderIds[i]] > 0, "Asset was already sold.");
            require(assetData[_orderIds[i]].contentAddress != address(0), "Invalid Order Data");
            
            escrowedAssetsByOrder[_orderIds[i]] = SafeMathUpgradeable.sub(escrowedAssetsByOrder[_orderIds[i]], _amounts[i]);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(StorageBase, ERC1155ReceiverUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}