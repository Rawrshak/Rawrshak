// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./OrderbookStorage.sol";
import "./EscrowDistributions.sol";
import "./EscrowERC20.sol";
import "./EscrowNFTs.sol";
import "./AddressRegistry.sol";

abstract contract ExchangeBase is OwnableUpgradeable {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    // bytes4(keccak256('EscrowERC20')) == 0xebf5787c
    bytes4 constant public ESCROW_ERC20_CONTRACT = 0xebf5787c;
    // bytes4(keccak256('EscrowNFTs')) == 0x13534f58
    bytes4 constant public ESCROW_NFTS_CONTRACT = 0x13534f58;
    // bytes4(keccak256('EscrowDistributions')) == 0x8354b629
    bytes4 constant public ESCROW_DISTRIBUTIONS_CONTRACT = 0x8354b629;
    // bytes4(keccak256('OrderbookStorage')) == 0xe22271ab
    bytes4 constant public ORDERBOOK_STORAGE_CONTRACT = 0xe22271ab;

    /***************** Stored Variables *****************/
    address private registry;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ExchangeBase_init_unchained(address _registry) public initializer {
        require(_registry != address(0), "Registry passed.");
        registry = _registry;
    }

    function _getRegistry() internal view returns(AddressRegistry) {
        return AddressRegistry(registry);
    }

    uint256[50] private __gap;
}