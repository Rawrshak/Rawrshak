// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../Collection.sol";
import "../CollectionManager.sol";
import "../CollectionStorage.sol";
import "../AccessControlManager.sol";

contract CollectionFactory is ContextUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for *;

    address public collectionImplementation;
    address public collectionManagerImplementation;
    address public collectionStorageImplementation;
    address public accessControlManagerImplementation;
    uint24 public contractVersion;

    EnumerableSetUpgradeable.AddressSet collectionContracts;
    EnumerableSetUpgradeable.AddressSet collectionManagerContracts;

    event ContractsDeployed(address indexed collection, address indexed collectionManager);

    function initialize(
        address _collection,
        address _collectionManager,
        address _collectionStorage,
        address _accessControlManager
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __CollectionFactory_init_unchained(_collection, _collectionManager, _collectionStorage, _accessControlManager);
    }

    function __CollectionFactory_init_unchained(
        address _collection,
        address _collectionManager,
        address _collectionStorage,
        address _accessControlManager
    )
        internal onlyInitializing
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_collection, _collectionManager, _collectionStorage, _accessControlManager);
    }

    /**
    * @dev Allows the owner to update the addresses of the contract implementations that the clones point to
    * @param _collection address of the new collection contract implementation
    * @param _collectionManager address of the new collection manager contract implementation
    * @param _collectionStorage address of the new collection storage contract implementation
    * @param _accessControlManager  address of the new access control manager contract implementation
    */
    function updateContracts(
        address _collection,
        address _collectionManager,
        address _collectionStorage,
        address _accessControlManager
    )
        public onlyOwner
    {
        // We can't check for supported interface Ids, because these contracts have not been initialized yet, and intializations is 
        // where the custom interfaces are registered
        require(
            _collection != address(0) &&
            _collectionManager != address(0) &&
            _collectionStorage != address(0) &&
            _accessControlManager != address(0),
            "contract address cannot be address zero"
        );

        contractVersion += 1;
        // Only the deployer and owner can update the implementation for newer collection contracts
        collectionImplementation = _collection;
        collectionManagerImplementation = _collectionManager;
        collectionStorageImplementation = _collectionStorage;
        accessControlManagerImplementation = _accessControlManager;
    }

    /**
    * @dev Checks whether the given collection proxy contract exists
    * @param _collection address of collection contract
    */
    function collectionExists(address _collection) public view returns(bool) {
        return collectionContracts.contains(_collection);
    }

    /**
    * @dev Checks whether the given collection manager proxy contract exists
    * @param _collectionManager address of collection manager contract
    */
    function collectionManagerExists(address _collectionManager) public view returns(bool) {
        return collectionManagerContracts.contains(_collectionManager);
    }

    /**
    * @dev Creates and deploys clones of the collection contracts and initializes their royalties and contract uri
    * @param _contractRoyaltyAccount the address of the contract's default royalty receiver
    * @param _contractRoyaltyRate the default contract royalty fee
    * @param _contractUri string contract information uri
    */
    function createContracts(
        address _contractRoyaltyAccount,
        uint24 _contractRoyaltyRate,
        string memory _contractUri
    ) external {
        Collection collection = (Collection)(ClonesUpgradeable.clone(collectionImplementation));
        CollectionManager collectionManager = (CollectionManager)(ClonesUpgradeable.clone(collectionManagerImplementation));
        CollectionStorage collectionStorage = (CollectionStorage)(ClonesUpgradeable.clone(collectionStorageImplementation));
        AccessControlManager accessControlManager = (AccessControlManager)(ClonesUpgradeable.clone(accessControlManagerImplementation));

        accessControlManager.initialize();
        collectionStorage.initialize(_contractRoyaltyAccount, _contractRoyaltyRate, _contractUri);
        collection.initialize(address(collectionStorage), address(accessControlManager));
        collectionManager.initialize(address(collection), address(collectionStorage), address(accessControlManager));
        
        // Grant Roles. CollectionManager receives the DEFAULT_ADMIN_ROLE as well. However, only the collection
        // contract is the parent.
        collectionStorage.grantRole(collectionStorage.DEFAULT_ADMIN_ROLE(), address(collectionManager));
        collectionStorage.setParent(address(collection));
        accessControlManager.grantRole(accessControlManager.DEFAULT_ADMIN_ROLE(), address(collectionManager));
        accessControlManager.grantRole(accessControlManager.MINTER_ROLE(), _msgSender());
        accessControlManager.setParent(address(collection));
        
        // transfer ownership to message sender
        collectionManager.transferOwnership(_msgSender());

        // Store collection contracts
        collectionContracts.add(address(collection));
        collectionManagerContracts.add(address(collectionManager));

        emit ContractsDeployed(address(collection), address(collectionManager));
    }
}
