// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./interfaces/IContent.sol";
import "./interfaces/IContentStorage.sol";
import "./interfaces/IContentManager.sol";
import "./interfaces/IAccessControlManager.sol";

contract ContentManager is IContentManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    
    /******************** Constants ********************/
    /*
     * IContentManager Interface: 0x250b1d27
     */

    /***************** Stored Variables *****************/
    IContent public override content;
    IContentStorage public override contentStorage;
    IAccessControlManager public override accessControlManager;

    /******************** Public API ********************/
    
    function initialize(
        address _content,
        address _contentStorage,
        address _accessControlManager
    )
        public initializer
    {
        __Ownable_init_unchained();
        __ERC165Storage_init_unchained();
        __ContentManager_init_unchained(_content, _contentStorage, _accessControlManager);
    }
    

    function __ContentManager_init_unchained(
        address _content,
        address _contentStorage,
        address _accessControlManager
    ) internal initializer {
        _registerInterface(type(IContentManager).interfaceId);
        content = IContent(_content);
        contentStorage = IContentStorage(_contentStorage);
        accessControlManager = IAccessControlManager(_accessControlManager);
    }
    
    function addAssetBatch(
        LibAsset.CreateData[] memory _assets
    ) external override onlyOwner {
        contentStorage.addAssetBatch(_assets);
    }
    
    function registerOperators(LibAsset.SystemApprovalPair[] memory _operators) public override onlyOwner {
        for (uint256 i = 0; i < _operators.length; ++i) {
            if (_operators[i].approved) {
                IAccessControlUpgradeable(address(accessControlManager)).grantRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            } else {
                IAccessControlUpgradeable(address(accessControlManager)).revokeRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            }
        }
    }

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setHiddenUriBatch(_assets);
    }
    
    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setPublicUriBatch(_assets);
    }

    function setContractRoyalty(address _receiver, uint24 _rate) external override onlyOwner {
        contentStorage.setContractRoyalty(_receiver, _rate);
    }
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyOwner {
        contentStorage.setTokenRoyaltiesBatch(_assets);
    }
    
    function mintBatch(LibAsset.MintData memory _data) external override onlyOwner {
        content.mintBatch(_data);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    uint256[50] private __gap;
}
