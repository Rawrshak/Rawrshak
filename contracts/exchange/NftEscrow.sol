// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./EscrowBase.sol";
import "../libraries/LibOrder.sol";
import "./interfaces/INftEscrow.sol";
import "../content/interfaces/IContent.sol";

contract NftEscrow is INftEscrow, EscrowBase, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for *;
    
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.AssetData) public override escrowedAsset;
    mapping(uint256 => uint256) public override escrowedAmounts;

    /******************** Public API ********************/
    function __NftEscrow_init() public initializer {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
        __EscrowBase_init_unchained();
        __NftEscrow_init_unchained();
    }

    function __NftEscrow_init_unchained() internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_NFT_ESCROW);
    }

    function deposit(
        uint256 _orderId,
        address _sender,
        uint256 _amount,
        LibOrder.AssetData memory _assetData
    ) external override onlyRole(MANAGER_ROLE) {
        // No need to do checks. The exchange contracts will do the checks.
        escrowedAsset[_orderId] = _assetData;
        escrowedAmounts[_orderId] = _amount;

        _transfer(_orderId, _sender, address(this), _amount);
    }

    // withdraw() and withdrawBatch() is called when a user buys an escrowed asset, a seller cancels an order 
    // and withdraw's their escrowed asset, or a buyer's order is filled and claims the escrowed asset.
    function withdraw(
        uint256 _orderId,
        address _receiver,
        uint256 _amount
    ) external override onlyRole(MANAGER_ROLE) {
        require(escrowedAmounts[_orderId] >= _amount, "Incorrect order amount to withdraw");

        escrowedAmounts[_orderId] = escrowedAmounts[_orderId] - _amount;

        _transfer(_orderId, address(this), _receiver, _amount);

        // Delete if order is filled; Gas Refund
        if (escrowedAmounts[_orderId] == 0) {
            delete escrowedAmounts[_orderId];
            delete escrowedAsset[_orderId];
        }
    }

    function withdrawBatch(
        uint256[] memory _orderIds,
        address _receiver,
        uint256[] memory _amounts
    ) external override onlyRole(MANAGER_ROLE) {
        for (uint256 i = 0; i < _orderIds.length; ++i) {            
            require(escrowedAmounts[_orderIds[i]] > 0, "Asset was already sold.");

            escrowedAmounts[_orderIds[i]] = escrowedAmounts[_orderIds[i]] - _amounts[i];
            _transfer(_orderIds[i], address(this), _receiver, _amounts[i]);
            
            // Delete if order is filled; Gas Refund
            if (escrowedAmounts[_orderIds[i]] == 0) {
                delete escrowedAmounts[_orderIds[i]];
                delete escrowedAsset[_orderIds[i]];
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(EscrowBase, ERC1155ReceiverUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/
    function _transfer(uint256 _orderId, address _sender, address _receiver, uint256 amount) internal {
        if (ERC165CheckerUpgradeable.supportsInterface(escrowedAsset[_orderId].contentAddress, LibInterfaces.INTERFACE_ID_CONTENT)) {
            IContent(escrowedAsset[_orderId].contentAddress)
                .safeTransferFrom(_sender, _receiver, escrowedAsset[_orderId].tokenId, amount, "");
        }
    }

    uint256[50] private __gap;
}