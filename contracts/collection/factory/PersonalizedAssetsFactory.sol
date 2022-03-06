// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../PersonalizedAssets.sol";
import "../PersonalizedAssetsStorage.sol";

contract PersonalizedAssetsFactory is ContextUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for *;

    address public personalizedAssetsImplementation;
    address public personalizedAssetsStorageImplementation;
    uint24 public contractVersion;

    EnumerableSetUpgradeable.AddressSet personalizedAssetsContracts;

    event UniqueContractsDeployed(address indexed personalizedAssets);

    function initialize(
        address _personalizedAssets,
        address _personalizedAssetsStorage
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __PersonalizedAssetsFactory_init_unchained(_personalizedAssets, _personalizedAssetsStorage);
    }

    function __PersonalizedAssetsFactory_init_unchained(
        address _personalizedAssets,
        address _personalizedAssetsStorage
    )
        internal onlyInitializing
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_personalizedAssets, _personalizedAssetsStorage);
    }

    /**
    * @dev Allows the owner to update the addresses of the contract implementations that the clones point to
    * @param _personalizedAssets address of the new personal assets contract implementation
    * @param _personalizedAssetsStorage address of the new personal assets storage contract implementation
    */
    function updateContracts(
        address _personalizedAssets,
        address _personalizedAssetsStorage
    )
        public onlyOwner
    {
        // We can't check for supported interface Ids, because these contracts have not been initialized yet, and intializations is 
        // where the custom interfaces are registered
        require(
            _personalizedAssets != address(0) &&
            _personalizedAssetsStorage != address(0),
            "contract address cannot be address zero"
        );

        contractVersion += 1;
        // Only the deployer and owner can update the implementation for newer personal assets contracts
        personalizedAssetsImplementation = _personalizedAssets;
        personalizedAssetsStorageImplementation = _personalizedAssetsStorage;
    }

    /**
    * @dev Checks whether the given personal assets proxy contract exists
    * @param _personalizedAssets address of the personal assets contract
    */
    function collectionExists(address _personalizedAssets) public view returns(bool) {
        return personalizedAssetsContracts.contains(_personalizedAssets);
    }

    /**
    * @dev Creates and deploys clones of the personal assets contracts and initializes the token collection's name and symbol
    * @param _name name of the token collection
    * @param _symbol shorthand name for the token collection
    */
    function createContracts(
        string memory _name,
        string memory _symbol
    ) external {
        PersonalizedAssets personalizedAssets = (PersonalizedAssets)(ClonesUpgradeable.clone(personalizedAssetsImplementation));
        PersonalizedAssetsStorage personalizedAssetsStorage = (PersonalizedAssetsStorage)(ClonesUpgradeable.clone(personalizedAssetsStorageImplementation));

        personalizedAssetsStorage.initialize();
        personalizedAssets.initialize(string(_name), string(_symbol), address(personalizedAssetsStorage));

        // Store collection contracts
        personalizedAssetsContracts.add(address(personalizedAssets));

        emit UniqueContractsDeployed(address(personalizedAssets));
    }
}