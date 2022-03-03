// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../UniqueCollection.sol";
import "../UniqueCollectionStorage.sol";

contract UniqueCollectionFactory is ContextUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for *;

    address public uniqueCollectionImplementation;
    address public uniqueCollectionStorageImplementation;
    uint24 public contractVersion;

    EnumerableSetUpgradeable.AddressSet uniqueCollectionContracts;

    event UniqueContractsDeployed(address indexed uniqueCollection);

    function initialize(
        address _uniqueCollection,
        address _uniqueCollectionStorage
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __UniqueCollectionFactory_init_unchained(_uniqueCollection, _uniqueCollectionStorage);
    }

    function __UniqueCollectionFactory_init_unchained(
        address _uniqueCollection,
        address _uniqueCollectionStorage
    )
        internal onlyInitializing
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_uniqueCollection, _uniqueCollectionStorage);
    }

    /**
    * @dev Allows the owner to update the addresses of the contract implementations that the clones point to
    * @param _uniqueCollection address of the new unique collection contract implementation
    * @param _uniqueCollectionStorage address of the new unique collection storage contract implementation
    */
    function updateContracts(
        address _uniqueCollection,
        address _uniqueCollectionStorage
    )
        public onlyOwner
    {
        // We can't check for supported interface Ids, because these contracts have not been initialized yet, and intializations is 
        // where the custom interfaces are registered
        require(
            _uniqueCollection != address(0) &&
            _uniqueCollectionStorage != address(0),
            "contract address cannot be address zero"
        );

        contractVersion += 1;
        // Only the deployer and owner can update the implementation for newer unique collection contracts
        uniqueCollectionImplementation = _uniqueCollection;
        uniqueCollectionStorageImplementation = _uniqueCollectionStorage;
    }

    /**
    * @dev Checks whether the given unique collection proxy contract exists
    * @param _uniqueCollection address of the unique collection contract
    */
    function collectionExists(address _uniqueCollection) public view returns(bool) {
        return uniqueCollectionContracts.contains(_uniqueCollection);
    }

    /**
    * @dev Creates and deploys clones of the unique collection contracts and initializes the token collection's name and symbol
    * @param _name name of the token collection
    * @param _symbol shorthand name for the token collection
    */
    function createContracts(
        string memory _name,
        string memory _symbol
    ) external {
        UniqueCollection uniqueCollection = (UniqueCollection)(ClonesUpgradeable.clone(uniqueCollectionImplementation));
        UniqueCollectionStorage uniqueCollectionStorage = (UniqueCollectionStorage)(ClonesUpgradeable.clone(uniqueCollectionStorageImplementation));

        uniqueCollectionStorage.initialize();
        uniqueCollection.initialize(string(_name), string(_symbol), address(uniqueCollectionStorage));

        // Store collection contracts
        uniqueCollectionContracts.add(address(uniqueCollection));

        emit UniqueContractsDeployed(address(uniqueCollection));
    }
}