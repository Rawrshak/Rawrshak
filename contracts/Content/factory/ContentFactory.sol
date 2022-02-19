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
        internal onlyInitializing
    {
        contractVersion = 0;

        // updateContracts increments the contract version to 1
        updateContracts(_content, _contentManager, _contentStorage, _accessControlManager);
    }

    /**
    * @dev Allows the owner to update the addresses of the contract implementations that the clones point to
    * @param _content address of the new content contract implementation
    * @param _contentManager address of the new content manager contract implementation
    * @param _contentStorage address of the new content storage contract implementation
    * @param _accessControlManager  address of the new access control manager contract implementation
    */
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

    /**
    * @dev Checks whether the given content proxy contract exists
    * @param _content address of content contract
    */
    function contentExists(address _content) public view returns(bool) {
        return contentContracts.contains(_content);
    }

    /**
    * @dev Checks whether the given content manager proxy contract exists
    * @param _contentManager address of content manager contract
    */
    function contentManagerExists(address _contentManager) public view returns(bool) {
        return contentManagerContracts.contains(_contentManager);
    }

    /**
    * @dev Creates and deploys clones of the content contracts and initializes their royalties and contract uri
    * @param _contractRoyaltyAccount the address of the contract's default royalty receiver
    * @param _contractRoyaltyRate the default contract royalty fee
    * @param _contractUri string contract information uri
    */
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
        accessControlManager.grantRole(accessControlManager.MINTER_ROLE(), _msgSender());
        accessControlManager.setParent(address(content));
        
        // transfer ownership to message sender
        contentManager.transferOwnership(_msgSender());

        // Store content contracts
        contentContracts.add(address(content));
        contentManagerContracts.add(address(contentManager));

        emit ContractsDeployed(address(content), address(contentManager));
    }
}
