// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../Content.sol";
import "../ContentManager.sol";
import "../ContentStorage.sol";
import "../AccessControlManager.sol";

contract ContentFactory is ContextUpgradeable, OwnableUpgradeable {
    using EnumerableSetUpgradeable for *;

    address public contentImplementation;
    address public contentManagerImplementation;
    address public contentStorageImplementation;
    address public accessControlManagerImplementation;
    uint24 public contractVersion;

    EnumerableSetUpgradeable.AddressSet contentContracts;
    EnumerableSetUpgradeable.AddressSet contentManagerContracts;

    event ContractsDeployed(address indexed content, address indexed contentManager);

    function initialize(
        address _content,
        address _contentManager,
        address _contentStorage,
        address _accessControlManager
    ) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __ContentFactory_init_unchained(_content, _contentManager, _contentStorage, _accessControlManager);
    }

    function __ContentFactory_init_unchained(
        address _content,
        address _contentManager,
        address _contentStorage,
        address _accessControlManager
    )
        internal initializer
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_content, _contentManager, _contentStorage, _accessControlManager);
    }

    function updateContracts(
        address _content,
        address _contentManager,
        address _contentStorage,
        address _accessControlManager
    )
        public onlyOwner
    {
        // We can't check for supported interface Ids, because these contracts have not been initialized yet, and intializations is 
        // where the custom interfaces are registered
        require(
            _content != address(0) &&
            _contentManager != address(0) &&
            _contentStorage != address(0) &&
            _accessControlManager != address(0),
            "contract address cannot be address zero"
        );

        contractVersion += 1;
        // Only the deployer and owner can update the implementation for newer content contracts
        contentImplementation = _content;
        contentManagerImplementation = _contentManager;
        contentStorageImplementation = _contentStorage;
        accessControlManagerImplementation = _accessControlManager;
    }

    function contentExists(address _content) public view returns(bool) {
        return contentContracts.contains(_content);
    }

    function contentManagerExists(address _contentManager) public view returns(bool) {
        return contentManagerContracts.contains(_contentManager);
    }

    function createContracts(
        address _contractRoyaltyAccount,
        uint24 _contractRoyaltyRate,
        string memory _contractUri
    ) external {
        Content content = (Content)(ClonesUpgradeable.clone(contentImplementation));
        ContentManager contentManager = (ContentManager)(ClonesUpgradeable.clone(contentManagerImplementation));
        ContentStorage contentStorage = (ContentStorage)(ClonesUpgradeable.clone(contentStorageImplementation));
        AccessControlManager accessControlManager = (AccessControlManager)(ClonesUpgradeable.clone(accessControlManagerImplementation));

        accessControlManager.initialize();
        contentStorage.initialize(_contractRoyaltyAccount, _contractRoyaltyRate, _contractUri);
        content.initialize(address(contentStorage), address(accessControlManager));
        contentManager.initialize(address(content), address(contentStorage), address(accessControlManager));
        
        // Grant Roles. ContentManager receives the DEFAULT_ADMIN_ROLE as well. However, only the content
        // contract is the parent.
        contentStorage.grantRole(contentStorage.DEFAULT_ADMIN_ROLE(), address(contentManager));
        contentStorage.setParent(address(content));
        accessControlManager.grantRole(accessControlManager.DEFAULT_ADMIN_ROLE(), address(contentManager));
        accessControlManager.setParent(address(content));
        
        // transfer ownership to message sender
        contentManager.transferOwnership(_msgSender());

        // Store content contracts
        contentContracts.add(address(content));
        contentManagerContracts.add(address(contentManager));

        emit ContractsDeployed(address(content), address(contentManager));
    }
}
