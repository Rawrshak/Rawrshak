// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./StorageBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/IEscrowNFTs.sol";
import "../content/interfaces/IContent.sol";

contract EscrowNFTs is IEscrowNFTs, StorageBase, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for *;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.AssetData) public override assetData;
    mapping(uint256 => uint256) public override escrowedAssetsByOrder;

    /******************** Public API ********************/
    function __EscrowNFTs_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(LibInterfaces.INTERFACE_ID_ESCROW_NFTS);
    }

    function deposit(
        uint256 _orderId,
        address _sender,
        uint256 _amount,
        LibOrder.AssetData memory _assetData
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        assetData[_orderId] = _assetData;
        escrowedAssetsByOrder[_orderId] = _amount;

        _transfer(_orderId, _sender, address(this), _amount);
    }

    // withdraw() and withdrawBatch() is called when a user buys an escrowed asset, a seller cancels an order 
    // and withdraw's their escrowed asset, or a buyer's order is filled and claims the escrowed asset.
    function withdraw(
        uint256 _orderId,
        address _receiver,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        require(escrowedAssetsByOrder[_orderId] >= _amount, "Incorrect order amount to withdraw");
        require(assetData[_orderId].contentAddress != address(0), "Invalid Order Data");

        escrowedAssetsByOrder[_orderId] = escrowedAssetsByOrder[_orderId] - _amount;
        _transfer(_orderId, address(this), _receiver, _amount);
    }

    function withdrawBatch(
        uint256[] memory _orderIds,
        address _receiver,
        uint256[] memory _amounts
    ) external override onlyRole(MANAGER_ROLE) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {            
            require(escrowedAssetsByOrder[_orderIds[i]] > 0, "Asset was already sold.");
            require(assetData[_orderIds[i]].contentAddress != address(0), "Invalid Order Data");
            
            escrowedAssetsByOrder[_orderIds[i]] = escrowedAssetsByOrder[_orderIds[i]] - _amounts[i];
            _transfer(_orderIds[i], address(this), _receiver, _amounts[i]);
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(StorageBase, ERC1155ReceiverUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/
    function _transfer(uint256 _orderId, address _sender, address _receiver, uint256 amount) internal {
        if (ERC165CheckerUpgradeable.supportsInterface(assetData[_orderId].contentAddress, LibInterfaces.INTERFACE_ID_CONTENT)) {
            IContent(assetData[_orderId].contentAddress)
                .safeTransferFrom(_sender, _receiver, assetData[_orderId].tokenId, amount, "");
        }
    }

    uint256[50] private __gap;
}