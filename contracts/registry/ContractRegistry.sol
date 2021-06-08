// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../utils/LibConstants.sol";
import "../content/ContentManager.sol";
import "../craft/Craft.sol";
import "../craft/Salvage.sol";

contract ContractRegistry is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;

    /***************** Stored Variables *****************/
    mapping(address => address[]) public contentManagers;
    mapping(address => address[]) public craft;
    mapping(address => address[]) public salvage;

    event ContentManagerRegistered(address indexed owner, address indexed contentManager);
    event CraftRegistered(address indexed manager, address indexed craft);
    event SalvageRegistered(address indexed manager, address indexed salvage);

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
        require(address(_contentManager) != address(0), "Invalid Address");
        require(_contentManager.owner() == _msgSender(), "Sender is not owner");
        require(_contentManager.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER), "Invalid input interface");

        contentManagers[_msgSender()].push(address(_contentManager));
        emit ContentManagerRegistered(_msgSender(), address(_contentManager));
    }

    function registerCraft(Craft _craft) external {
        require(address(_craft) != address(0), "Invalid Address");
        require(_craft.hasRole(_craft.MANAGER_ROLE(), msg.sender), "Invalid permissions.");
        require(_craft.supportsInterface(LibConstants._INTERFACE_ID_CRAFT), "Invalid input interface");

        craft[_msgSender()].push(address(_craft));
        emit CraftRegistered(_msgSender(), address(_craft));
    }

    function registerSalvage(Salvage _salvage) external {
        require(address(_salvage) != address(0), "Invalid Address");
        require(_salvage.hasRole(_salvage.MANAGER_ROLE(), msg.sender), "Invalid permissions.");
        require(_salvage.supportsInterface(LibConstants._INTERFACE_ID_SALVAGE), "Invalid input interface");

        salvage[_msgSender()].push(address(_salvage));
        emit SalvageRegistered(_msgSender(), address(_salvage));
    }
}