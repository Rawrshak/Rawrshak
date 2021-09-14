// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./OrderbookStorage.sol";
import "./EscrowERC20.sol";
import "./EscrowNFTs.sol";
import "./interfaces/IAddressRegistry.sol";

abstract contract ManagerBase is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    // bytes4(keccak256('RAWR')) == 0xd4df6855
    bytes4 constant public ESCROW_RAWR_CONTRACT = 0xd4df6855;
    // bytes4(keccak256('EscrowNFTs')) == 0x13534f58
    bytes4 constant public ESCROW_NFTS_CONTRACT = 0x13534f58;
    // bytes4(keccak256('OrderbookStorage')) == 0xe22271ab
    bytes4 constant public ORDERBOOK_STORAGE_CONTRACT = 0xe22271ab;
    // bytes4(keccak256('ExchangeFeePool')) == 0x018d6f5c
    bytes4 constant public EXCHANGE_FEE_POOL = 0x018d6f5c;

    /***************** Stored Variables *****************/
    IAddressRegistry internal registry;

    /******************** Public API ********************/
    function __ManagerBase_init_unchained(address _registry) public initializer {
        require(_registry != address(0), "Registry passed.");
        registry = IAddressRegistry(_registry);
    }

    uint256[50] private __gap;
}