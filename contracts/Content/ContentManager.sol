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
    
    /**
    * @dev adds a batch of new tokens, sets their supply and max supply, sets their first hidden and public uris and sets their 
    * royalties
    * @param _assets array of LibAsset.CreateData structure objects
    */
    function addAssetBatch(
        LibAsset.CreateData[] memory _assets
    ) external override onlyOwner {
        contentStorage.addAssetBatch(_assets);
    }
    
    /**
    * @dev Update the wallet's contract access roles
    * @param _operators array of wallets whose roles are getting updated
    */
    function registerOperators(LibAsset.SystemApprovalPair[] memory _operators) public override onlyOwner {
        for (uint256 i = 0; i < _operators.length; ++i) {
            if (_operators[i].approved) {
                IAccessControlUpgradeable(address(accessControlManager)).grantRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            } else {
                IAccessControlUpgradeable(address(accessControlManager)).revokeRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            }
        }
    }

    /**
    * @dev adds new versions of tokens to the hiddenUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setHiddenUriBatch(_assets);
    }
    
    /**
    * @dev adds new versions of tokens to the publicUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setPublicUriBatch(_assets);
    }
    /**
    * @dev sets the address of who receives the contract royalties and the rate, which must be between 0 and 1,000,000 (100%). This is used as the defaulty royalty for assets when token royalties are not set.
    * @param _receiver address to receives the royalties
    * @param _rate royalty fee percentage
    */
    function setContractRoyalty(address _receiver, uint24 _rate) external override onlyOwner {
        contentStorage.setContractRoyalty(_receiver, _rate);
    }
    
    /**
    * @dev sets the address of the receiver and the royalty rate for each individual token in a batch
    * @param _assets array of LibAsset.AssetRoyalties structure objects
    */
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyOwner {
        contentStorage.setTokenRoyaltiesBatch(_assets);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    uint256[50] private __gap;
}
