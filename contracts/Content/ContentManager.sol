// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "../utils/LibInterfaces.sol";
import "./interfaces/IContent.sol";
import "./interfaces/IContentStorage.sol";
import "./interfaces/IContentManager.sol";
import "./interfaces/IAccessControlManager.sol";

contract ContentManager is IContentManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('owner()')) == 0x8da5cb5b
     * bytes4(keccak256('renounceOwnership()')) == 0x715018a6
     * bytes4(keccak256('transferOwnership()')) == 0x880ad0af
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     * bytes4(keccak256('content()')) == 0x8a4d5a67
     * bytes4(keccak256('contentStorage()')) == 0xae95f3ca
     * bytes4(keccak256('accessControlManager()')) == 0xb4a0bdf3
     * bytes4(keccak256('addAssetBatch(LibAsset.CreateData[] memory)')) == 0x4c45670b
     * bytes4(keccak256('registerOperators(LibAsset.SystemApprovalPair[] memory)')) == 0x6c728bc8
     * bytes4(keccak256('setHiddenUriBatch(LibAsset.AssetUri[] memory)')) == 0x8c8e95fa
     * bytes4(keccak256('setPublicUriBatch(LibAsset.AssetUri[] memory)')) == 0xc6c6617e
     * bytes4(keccak256('setContractRoyalty(LibRoyalty.Fee[] memory)')) == 0xa2de9fbe
     * bytes4(keccak256('setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory)')) == 0x5090ab4f
     * bytes4(keccak256('mintBatch(LibAsset.MintData memory)')) == 0x9791d37a
     */
    // bytes4 private constant INTERFACE_ID_CONTENT_MANAGER = 0xEAD82167;

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

        // emit ContentManagerCreated(_msgSender(), _content, _contentStorage, _accessControlManager);
    }
    

    function __ContentManager_init_unchained(
        address _content,
        address _contentStorage,
        address _accessControlManager
    ) internal initializer {
        _registerInterface(LibInterfaces.INTERFACE_ID_CONTENT_MANAGER);
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
