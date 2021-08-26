// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../utils/LibConstants.sol";
import "../content/ContentManager.sol";
import "../content/TagsManager.sol";
import "../craft/Craft.sol";
import "../craft/Salvage.sol";

// Todo: Create a Contract Registry Test
contract ContractRegistry is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /***************** Stored Variables *****************/
    mapping(address => EnumerableSetUpgradeable.AddressSet) private owners;
    EnumerableSetUpgradeable.AddressSet contentManagers;
    EnumerableSetUpgradeable.AddressSet craft;
    EnumerableSetUpgradeable.AddressSet salvage;
    TagsManager public tagsManager;

    event ContentManagerRegistered(address indexed owner, address indexed contentManager);
    event CraftRegistered(address indexed manager, address indexed craft);
    event SalvageRegistered(address indexed manager, address indexed salvage);
    event TagsManagerSet(address indexed manager);

    /******************** Public API ********************/
    function __ContractRegistry_init()
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER_REGISTRY);
    }

    function registerContentManager(Content _contentManager) external {
        require(address(_contentManager) != address(0) && address(_contentManager).isContract(), "Invalid Address");
        require(_contentManager.owner() == _msgSender(), "Sender is not owner");
        require(_contentManager.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER), "Invalid input interface");

        owners[_msgSender()].add(address(_contentManager));
        contentManagers.add(address(_contentManager));
        emit ContentManagerRegistered(_msgSender(), address(_contentManager));
    }

    function registerCraft(Craft _craft) external {
        require(address(_craft) != address(0) && address(_craft).isContract(), "Invalid Address");
        require(_craft.hasRole(_craft.MANAGER_ROLE(), msg.sender), "Invalid permissions.");
        require(_craft.supportsInterface(LibConstants._INTERFACE_ID_CRAFT), "Invalid input interface");

        owners[_msgSender()].add(address(_craft));
        craft.add(address(_craft));
        emit CraftRegistered(_msgSender(), address(_craft));
    }

    function registerSalvage(Salvage _salvage) external {
        require(address(_salvage) != address(0) && address(_salvage).isContract(), "Invalid Address");
        require(_salvage.hasRole(_salvage.MANAGER_ROLE(), msg.sender), "Invalid permissions.");
        require(_salvage.supportsInterface(LibConstants._INTERFACE_ID_SALVAGE), "Invalid input interface");

        owners[_msgSender()].add(address(_salvage));
        salvage.add(address(_salvage));
        emit SalvageRegistered(_msgSender(), address(_salvage));
    }

    function isRegistered(address _contractAddress) external view returns(bool) {
        require(_contractAddress != address(0) && _contractAddress.isContract(), "Invalid Address");

        if (_contractAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER)) {
            return contentManagers.contains(_contractAddress);
        } else if (_contractAddress.supportsInterface(LibConstants._INTERFACE_ID_CRAFT)) {
            return craft.contains(_contractAddress);
        } else if (_contractAddress.supportsInterface(LibConstants._INTERFACE_ID_SALVAGE)) {
            return salvage.contains(_contractAddress);
        }

        return false;
    }

    function setTagsManager(TagsManager _manager) external onlyOwner {
        require(address(_manager) != address(0) && address(_manager).isContract(), "Invalid Address");
        require(_manager.supportsInterface(LibConstants._INTERFACE_ID_TAGS_MANAGER), "Invalid input interface");

        tagsManager = _manager;

        emit TagsManagerSet(address(_manager));
    }
}