// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../utils/LibConstants.sol";
import "../content/ContentManager.sol";

contract ContentManagerRegistry is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;

    /***************** Stored Variables *****************/
    mapping(address => address[]) public contentManagers;
    address[] test;

    event ContentManagerRegistered(address indexed owner, address indexed contentManager);

    /******************** Public API ********************/
    function __ContentManagerRegistry_init()
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

        contentManagers[_msgSender()].push(address(_contentManager));
        emit ContentManagerRegistered(_msgSender(), address(_contentManager));
    }
}