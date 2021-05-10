// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "./StorageBase.sol";
import "../utils/ExtendedEnumerableMaps.sol";

contract FeePool is StorageBase {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    // EnumerableSetUpgradeable.AddressSet internal escrows;
    mapping(bytes4 => uint256) amounts;
    address parent;
    uint256 public bps;
    ExtendedEnumerableMaps.AddressToUintMap funds;

    /******************** Public API ********************/
    function __FeePool_init_unchained(address _parent) public initializer {
        __Context_init_unchained();
        __AccessControl_init_unchained();
        __StorageBase_init_unchained();
        parent = _parent;
    }
 
    function setBps(uint256 _bps) external {
        require(_bps > 0 && _bps < 10000, "Invalid rate");
        bps = _bps;
    }

    function balanceOf(bytes4 _token) external view returns(uint256) {
        return amounts[_token];
    }

    function updateFunds(address[] calldata fundAddresses, uint256[] calldata percentage) external {
        require(fundAddresses.length > 0 && fundAddresses.length == percentage.length, "Invalid input length");

        // for (uint256 i = 0; i < )
    }
}