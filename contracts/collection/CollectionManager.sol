// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./interfaces/ICollection.sol";
import "./interfaces/ICollectionStorage.sol";
import "./interfaces/ICollectionManager.sol";
import "./interfaces/IAccessControlManager.sol";

contract CollectionManager is ICollectionManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * ICollectionManager Interface: 0x250b1d27
     */

    /***************** Stored Variables *****************/
    ICollection public override collection;
    ICollectionStorage collectionStorage;
    IAccessControlManager accessControlManager;

    /******************** Public API ********************/
    
    function initialize(
        address _collection,
        address _collectionStorage,
        address _accessControlManager
    )
        public initializer
    {
        __Ownable_init_unchained();
        __ERC165Storage_init_unchained();
        __CollectionManager_init_unchained(_collection, _collectionStorage, _accessControlManager);
    }

    function __CollectionManager_init_unchained(
        address _collection,
        address _collectionStorage,
        address _accessControlManager
    ) internal onlyInitializing {
        _registerInterface(type(ICollectionManager).interfaceId);
        collection = ICollection(_collection);
        collectionStorage = ICollectionStorage(_collectionStorage);
        accessControlManager = IAccessControlManager(_accessControlManager);
    }
    
    /**
    * @dev checks whether or not the address passed has the Minter role
    * @param _minter address of the minter
    */
    function isMinter(address _minter) external view override returns(bool) {
        return IAccessControlUpgradeable(address(accessControlManager)).hasRole(accessControlManager.MINTER_ROLE(), _minter);
    }
    
    /**
    * @dev adds a batch of new tokens, sets their supply and max supply, sets their first hidden and public uris and sets their 
    * royalties
    * @param _assets array of LibAsset.CreateData structure objects
    */
    function addAssetBatch(
        LibAsset.CreateData[] memory _assets
    ) external override onlyOwner {
        collectionStorage.addAssetBatch(_assets);
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
    * @dev Update a system contract's access roles
    * @param _contracts array of system contracts whose roles are getting updated
    */
    function registerSystemContracts(LibAsset.SystemApprovalPair[] memory _contracts) public override onlyOwner {
        for (uint256 i = 0; i < _contracts.length; ++i) {
            require(_contracts[i].operator.isContract(), "Error: not a contract");
            if (_contracts[i].approved) {
                IAccessControlUpgradeable(address(accessControlManager)).grantRole(accessControlManager.SYSTEM_CONTRACT_ROLE(), _contracts[i].operator);
            } else {
                IAccessControlUpgradeable(address(accessControlManager)).revokeRole(accessControlManager.SYSTEM_CONTRACT_ROLE(), _contracts[i].operator);
            }
        }
    }

    /**
    * @dev adds new versions of tokens to the hiddenUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        collectionStorage.setHiddenUriBatch(_assets);
    }
    
    /**
    * @dev adds new versions of tokens to the publicUris mapping
    * @param _assets array of LibAsset.AssetUri structure objects
    */
    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        collectionStorage.setPublicUriBatch(_assets);
    }
    /**
    * @dev sets the address of who receives the contract royalties and the rate, which must be between 0 and 1,000,000 (100%). This is used as the defaulty royalty for assets when token royalties are not set.
    * @param _receiver address to receives the royalties
    * @param _rate royalty fee percentage
    */
    function setContractRoyalty(address _receiver, uint24 _rate) external override onlyOwner {
        collectionStorage.setContractRoyalty(_receiver, _rate);
    }
    
    /**
    * @dev sets the address of the receiver and the royalty rate for each individual token in a batch
    * @param _assets array of LibAsset.AssetRoyalties structure objects
    */
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyOwner {
        collectionStorage.setTokenRoyaltiesBatch(_assets);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    uint256[50] private __gap;
}
