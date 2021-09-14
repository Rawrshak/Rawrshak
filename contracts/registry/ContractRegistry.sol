// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../utils/LibConstants.sol";

contract ContractRegistry is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('owner()')) == 0x8da5cb5b
     * bytes4(keccak256('renounceOwnership()')) == 0x715018a6
     * bytes4(keccak256('transferOwnership()')) == 0x880ad0af
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     * bytes4(keccak256('registerContentManager(address)')) == 0x8ff992d5
     * bytes4(keccak256('isRegistered(address)')) == 0xc3c5a547
     */
    // bytes4 private constant _INTERFACE_ID_CONTRACT_REGISTRY = 0x498D4CA2;

    /***************** Stored Variables *****************/
    mapping(address => EnumerableSetUpgradeable.AddressSet) private owners;
    EnumerableSetUpgradeable.AddressSet contentManagers;
    EnumerableSetUpgradeable.AddressSet content;

    event ContentManagerRegistered(address indexed owner, address indexed contentManager);

    /******************** Public API ********************/
    function __ContractRegistry_init()
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ContractRegistry_init_unchained();
    }
    
    function __ContractRegistry_init_unchained() internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_CONTRACT_REGISTRY);
    }

    function registerContentManager(address _contentManager) external {
        require(_contentManager != address(0) && _contentManager.isContract(), "Invalid Address");
        require(OwnableUpgradeable(_contentManager).owner() == _msgSender(), "Sender is not owner");
        require(_contentManager.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER), "Invalid input interface");

        owners[_msgSender()].add(_contentManager);
        contentManagers.add(_contentManager);
        emit ContentManagerRegistered(_msgSender(), _contentManager);
    }

    function isRegistered(address _contractAddress) external view returns(bool) {
        require(_contractAddress != address(0) && _contractAddress.isContract(), "Invalid Address");

        if (_contractAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER)) {
            return contentManagers.contains(_contractAddress);
        } else if (_contractAddress.supportsInterface(LibConstants._INTERFACE_ID_CONTENT)) {
            return content.contains(_contractAddress);
        } 

        return false;
    }
}