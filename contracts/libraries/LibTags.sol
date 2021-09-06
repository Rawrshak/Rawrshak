// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

library LibTags {
    using SafeMathUpgradeable for uint256;
    using EnumerableSetUpgradeable for *;

    // bytes32 public constant MINT_DATA_TYPEHASH = keccak256("MintData(address to,uint256[] tokenIds,uint256[] amounts,uint256 nonce,address signer)");
    
    struct AssetPair {
        address contractAddress;
        uint256 tokenId;
    }

    struct TagData {
        // mapping(bytes4 => AssetPair) assets;
        EnumerableSetUpgradeable.Bytes32Set assets;
        EnumerableSetUpgradeable.AddressSet contracts;
    }
}