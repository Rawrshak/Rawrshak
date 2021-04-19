// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./OrderbookStorage.sol";
import "./EscrowDistributions.sol";
import "./EscrowERC20.sol";
import "./EscrowNFTs.sol";
import "./interfaces/IAddressRegistry.sol";

abstract contract ManagerBase is OwnableUpgradeable {
    using AddressUpgradeable for address;
    
    /******************** Constants ********************/
    // bytes4(keccak256('RAWR')) == 0xd4df6855
    bytes4 constant public ESCROW_RAWR_CONTRACT = 0xd4df6855;
    // bytes4(keccak256('RAWR_DISTRIBUTIONS')) == 0xe26cf780
    bytes4 constant public ESCROW_RAWR_DISTRIBUTIONS_CONTRACT = 0xe26cf780;
    // bytes4(keccak256('EscrowNFTs')) == 0x13534f58
    bytes4 constant public ESCROW_NFTS_CONTRACT = 0x13534f58;
    // bytes4(keccak256('OrderbookStorage')) == 0xe22271ab
    bytes4 constant public ORDERBOOK_STORAGE_CONTRACT = 0xe22271ab;

    /***************** Stored Variables *****************/
    IAddressRegistry internal registry;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ManagerBase_init_unchained(address _registry) public initializer {
        require(_registry != address(0), "Registry passed.");
        registry = IAddressRegistry(_registry);
    }

    uint256[50] private __gap;
}