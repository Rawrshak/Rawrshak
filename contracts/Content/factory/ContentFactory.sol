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

    event ContractsDeployed(address content, address contentManager);

    function __ContentFactory_init(
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
        LibRoyalties.Fees[] memory _contractFees,
        string memory _contractUri
    ) external {
        Content content = (Content)(ClonesUpgradeable.clone(contentImplementation));
        ContentManager contentManager = (ContentManager)(ClonesUpgradeable.clone(contentManagerImplementation));
        ContentStorage contentStorage = (ContentStorage)(ClonesUpgradeable.clone(contentStorageImplementation));
        AccessControlManager accessControlManager = (AccessControlManager)(ClonesUpgradeable.clone(accessControlManagerImplementation));

        accessControlManager.__AccessControlManager_init();
        contentStorage.__ContentStorage_init(_contractFees, _contractUri);
        content.__Content_init(address(contentStorage), address(accessControlManager));
        contentManager.__ContentManager_init(address(content), address(contentStorage), address(accessControlManager));
        
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