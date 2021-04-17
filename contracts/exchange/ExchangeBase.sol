// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./OrderbookStorage.sol";
import "./EscrowDistributions.sol";
import "./EscrowERC20.sol";
import "./EscrowNFTs.sol";

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
    mapping(bytes4 => address) contracts;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __ExchangeBase_init_unchained(
        address escrowErc20Contract,
        address escrowNFTsContract,
        address escrowDistributionsContract,
        address orderbookStorageContract) public initializer {
        require(escrowErc20Contract != address(0) && escrowNFTsContract != address(0) &&
                escrowDistributionsContract != address(0) && orderbookStorageContract != address(0) &&
                escrowErc20Contract.isContract() && escrowNFTsContract.isContract() &&
                escrowDistributionsContract.isContract() && orderbookStorageContract.isContract(), "Invalid contract passed.");
        contracts[ESCROW_ERC20_CONTRACT] = escrowErc20Contract;
        contracts[ESCROW_NFTS_CONTRACT] = escrowNFTsContract;
        contracts[ESCROW_DISTRIBUTIONS_CONTRACT] = escrowDistributionsContract;
        contracts[ORDERBOOK_STORAGE_CONTRACT] = orderbookStorageContract;
    }

    /**************** Internal Functions ****************/

    function _setContract(bytes4 name, address contractAddr) internal {
        require(contractAddr.isContract());
        // Todo: Add interface to Contracts and check for correct interface
        // if (name == ESCROW_ERC20_CONTRACT) {
        //     require()
        // }
        contracts[name] = contractAddr;
    }

    function _contract(bytes4 name) internal view returns(address) {
        return contracts[name];
    }

    uint256[50] private __gap;
}