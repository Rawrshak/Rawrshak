// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../UniqueContent.sol";
import "../UniqueContentStorage.sol";

contract UniqueContentFactory is ContextUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for *;

    address public uniqueContentImplementation;
    address public uniqueContentStorageImplementation;
    uint24 public contractVersion;

    EnumerableSetUpgradeable.AddressSet uniqueContentContracts;

    event UniqueContractsDeployed(address indexed uniqueContent);

    function initialize(
        address _uniqueContent,
        address _uniqueContentStorage
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __UniqueContentFactory_init_unchained(_uniqueContent, _uniqueContentStorage);
    }

    function __UniqueContentFactory_init_unchained(
        address _uniqueContent,
        address _uniqueContentStorage
    )
        internal onlyInitializing
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_uniqueContent, _uniqueContentStorage);
    }

    /**
    * @dev Allows the owner to update the addresses of the contract implementations that the clones point to
    * @param _uniqueContent address of the new unique content contract implementation
    * @param _uniqueContentStorage address of the new unique content storage contract implementation
    */
    function updateContracts(
        address _uniqueContent,
        address _uniqueContentStorage
    )
        public onlyOwner
    {
        // We can't check for supported interface Ids, because these contracts have not been initialized yet, and intializations is 
        // where the custom interfaces are registered
        require(
            _uniqueContent != address(0) &&
            _uniqueContentStorage != address(0),
            "contract address cannot be address zero"
        );

        contractVersion += 1;
        // Only the deployer and owner can update the implementation for newer unique content contracts
        uniqueContentImplementation = _uniqueContent;
        uniqueContentStorageImplementation = _uniqueContentStorage;
    }

    /**
    * @dev Checks whether the given unique content proxy contract exists
    * @param _uniqueContent address of the unique content contract
    */
    function contentExists(address _uniqueContent) public view returns(bool) {
        return uniqueContentContracts.contains(_uniqueContent);
    }

    /**
    * @dev Creates and deploys clones of the unique content contracts and initializes the token collection's name and symbol
    * @param _name name of the token collection
    * @param _symbol shorthand name for the token collection
    */
    function createContracts(
        string memory _name,
        string memory _symbol
    ) external {
        UniqueContent uniqueContent = (UniqueContent)(ClonesUpgradeable.clone(uniqueContentImplementation));
        UniqueContentStorage uniqueContentStorage = (UniqueContentStorage)(ClonesUpgradeable.clone(uniqueContentStorageImplementation));

        uniqueContentStorage.initialize();
        uniqueContent.initialize(string(_name), string(_symbol), address(uniqueContentStorage));

        // Store content contracts
        uniqueContentContracts.add(address(uniqueContent));

        emit UniqueContractsDeployed(address(uniqueContent));
    }
}