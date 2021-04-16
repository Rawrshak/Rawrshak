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
import "./EscrowBase.sol";
import "./LibOrder.sol";

contract EscrowNFTs is EscrowBase, ERC1155HolderUpgradeable, ERC721HolderUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for *;
    
    /******************** Constants ********************/
    /***************** Stored Variables *****************/
    mapping(uint256 => LibOrder.AssetData) orderData;
    mapping(address => mapping(uint256 => uint256)) public escrowedAssetsByOwner;
    // mapping(address => mapping(uint256 => uint256)) public claimableAssetsByOwner;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __EscrowNFTs_init() public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ERC1155Holder_init_unchained();
        __ERC721Holder_init_unchained();
    }

    function deposit(
        address user,
        uint256 orderId,
        uint256 amount,
        LibOrder.AssetData memory assetData
    ) external onlyOwner {
        require(
            ERC165CheckerUpgradeable.supportsInterface(assetData.contentAddress, type(IERC1155Upgradeable).interfaceId) || 
            ERC165CheckerUpgradeable.supportsInterface(assetData.contentAddress, type(IERC721Upgradeable).interfaceId),
            "Invalid contract interface.");

        // No need to do checks. The exchange contracts will do the checks.
        orderData[orderId] = assetData;
        escrowedAssetsByOwner[user][orderId] = amount;
        _transferAsset(user, address(this), assetData.contentAddress, assetData.tokenId, amount);
    }

    // withdraw() and withdrawBatch() is called when a user buys an escrowed asset, a seller cancels an order 
    // and withdraw's their escrowed asset, or a buyer's order is filled and claims the escrowed asset.
    function withdraw(
        address owner,
        address to,
        uint256 orderId,
        uint256 amount
    ) external onlyOwner {
        require(escrowedAssetsByOwner[to][orderId] > 0, "Asset was already sold.");
        require(orderData[orderId].contentAddress != address(0), "Invalid Order Data");

        address content = orderData[orderId].contentAddress;
        uint256 id = orderData[orderId].tokenId;

        escrowedAssetsByOwner[owner][orderId] = SafeMathUpgradeable.sub(escrowedAssetsByOwner[owner][orderId], amount);

        _transferAsset(address(this), to, content, id, amount);
    }

    function withdrawBatch(
        address owner,
        address to,
        uint256[] memory orderIds,
        uint256[] memory amounts
    ) external onlyOwner {
        require(orderIds.length > 0, "invalid order length");
        require(orderIds.length == amounts.length, "order length mismatch");
        for (uint256 i = 0; i < orderIds.length; ++i) {
            if (orderData[orderIds[i]].contentAddress == address(0) || 
                escrowedAssetsByOwner[owner][orderIds[i]] == 0) {
                continue;
            }

            address content = orderData[orderIds[i]].contentAddress;
            uint256 id = orderData[orderIds[i]].tokenId;
            
            escrowedAssetsByOwner[owner][orderIds[i]] = SafeMathUpgradeable.sub(escrowedAssetsByOwner[owner][orderIds[i]], amounts[i]);

            _transferAsset(address(this), to, content, id,  amounts[i]);
        }
    }

    /**************** Internal Functions ****************/
    function _transferAsset(address from, address to, address tokenAddr, uint256 id, uint256 amount) internal {
        if (ERC165CheckerUpgradeable.supportsInterface(tokenAddr, type(IERC1155Upgradeable).interfaceId)) {
            IERC1155Upgradeable(tokenAddr).safeTransferFrom(from, to, id, amount, "");
        } else {
            IERC721Upgradeable(tokenAddr).safeTransferFrom(from, to, id, "");
        }
    }

    uint256[50] private __gap;
}