// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/IAddressRegistry.sol";
import "../utils/LibConstants.sol";

contract AddressRegistry is IAddressRegistry, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;

    /***************** Stored Variables *****************/
    mapping(bytes4 => address) private registry;
    
    /*********************** Events *********************/
    event AddressRegistered(bytes4 id, address contractAddress);

    /******************** Public API ********************/
    function __AddressRegistry_init() public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_ADDRESS_REGISTRY);
    }

    function registerAddress(bytes4[] calldata _ids, address[] calldata _addresses) external override onlyOwner {
        // this will only called internally on creation. No need to check whether or not these addresses are 
        // valid contracts as we will guarantee that they are. Removing this saves gas costs.
        require(_ids.length > 0 && _ids.length == _addresses.length, "Invalid input length.");

        for (uint i = 0; i < _ids.length; ++i) {
            registry[_ids[i]] = _addresses[i];
            emit AddressRegistered(_ids[i], _addresses[i]);
        }
    }

    function getAddress(bytes4 _id) external view override returns(address) {
        return registry[_id];
    }

    function getAddressWithCheck(bytes4 _id) external view override returns(address) {
        require(registry[_id] != address(0), "Missing Contract Address");
        return registry[_id];
    }

    uint256[50] private __gap;
}