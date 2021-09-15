// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./EscrowERC20.sol";
import "./EscrowNFTs.sol";
import "../resolver/IAddressResolver.sol";

abstract contract ManagerBase is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    
    /***************** Stored Variables *****************/
    IAddressResolver internal resolver;

    /******************** Public API ********************/
    function __ManagerBase_init_unchained(address _resolver) public initializer {
        require(_resolver != address(0), "resolver passed.");
        resolver = IAddressResolver(_resolver);
    }

    uint256[50] private __gap;
}