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
    mapping(address => mapping(uint256 => uint256)) public claimableAssetsByOwner;

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
        address from,
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
        escrowedAssetsByOwner[from][orderId] = amount;
    }

    function transfer(address from, address to, uint256 orderId, uint256 amount) external onlyOwner {
        // check escrowed asset, move from escrow to claimable
        require(escrowedAssetsByOwner[from][orderId] >= amount, "Assets are already sold.");
        
        // move from escrow to claimable
        escrowedAssetsByOwner[from][orderId] = SafeMathUpgradeable.sub(escrowedAssetsByOwner[from][orderId], amount);
        claimableAssetsByOwner[to][orderId] = SafeMathUpgradeable.add(claimableAssetsByOwner[from][orderId], amount);
    }

    function withdraw(
        address to,
        uint256 orderId
    ) external onlyOwner {
        require(escrowedAssetsByOwner[to][orderId] > 0, "Asset was already sold.");
        require(orderData[orderId].contentAddress != address(0), "Invalid Order Data");

        address content = orderData[orderId].contentAddress;
        uint256 id = orderData[orderId].tokenId;
        uint256 amount = escrowedAssetsByOwner[to][orderId];
        escrowedAssetsByOwner[to][orderId] = 0;

        _transferAsset(to, content, id, amount);
    }

    function withdrawBatch(
        address to,
        uint256[] memory orderIds
    ) external onlyOwner {
        require(orderIds.length > 0, "invalid order length");
        for (uint256 i = 0; i < orderIds.length; ++i) {
            if (orderData[orderIds[i]].contentAddress == address(0) || 
                escrowedAssetsByOwner[to][orderIds[i]] == 0) {
                continue;
            }

            address content = orderData[orderIds[i]].contentAddress;
            uint256 id = orderData[orderIds[i]].tokenId;
            uint256 amount = escrowedAssetsByOwner[to][orderIds[i]];
            escrowedAssetsByOwner[to][orderIds[i]] = 0;
            _transferAsset(to, content, id, amount);
        }
    }

    function claim(
        address to,
        uint256 orderId
    ) external onlyOwner {
        require(claimableAssetsByOwner[to][orderId] > 0, "Asset was already claimed.");
        require(orderData[orderId].contentAddress != address(0), "Invalid Order Data");

        address content = orderData[orderId].contentAddress;
        uint256 id = orderData[orderId].tokenId;
        uint256 amount = claimableAssetsByOwner[to][orderId];
        claimableAssetsByOwner[to][orderId] = 0;        
        _transferAsset(to, content, id, amount);
    }

    function claimBatch(
        address to,
        uint256[] memory orderIds
    ) external onlyOwner {
        require(orderIds.length > 0, "invalid order length");
        for (uint256 i = 0; i < orderIds.length; ++i) {
            if (orderData[orderIds[i]].contentAddress == address(0) || 
                claimableAssetsByOwner[to][orderIds[i]] == 0) {
                continue;
            }

            address content = orderData[orderIds[i]].contentAddress;
            uint256 id = orderData[orderIds[i]].tokenId;
            uint256 amount = claimableAssetsByOwner[to][orderIds[i]];
            claimableAssetsByOwner[to][orderIds[i]] = 0;
            _transferAsset(to, content, id, amount);
        }
    }

    /**************** Internal Functions ****************/
    function _transferAsset(address to, address tokenAddr, uint256 id, uint256 amount) internal {
        if (ERC165CheckerUpgradeable.supportsInterface(tokenAddr, type(IERC1155Upgradeable).interfaceId)) {
            IERC1155Upgradeable(tokenAddr).safeTransferFrom(address(this), to, id, amount, "");
        } else {
            IERC721Upgradeable(tokenAddr).safeTransferFrom(address(this), to, id, "");
        }
    }

    uint256[50] private __gap;
}