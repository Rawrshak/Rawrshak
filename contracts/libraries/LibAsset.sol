// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library LibAsset {

    bytes32 public constant MINT_DATA_TYPEHASH = keccak256("MintData(address to,uint256[] tokenIds,uint256[] amounts,uint256 nonce,address signer)");
        
    struct CreateData {
        string publicDataUri;
        string hiddenDataUri;
        uint256 maxSupply;
        address royaltyReceiver;
        uint24 royaltyRate;
    }

    struct MintData {
        address to;
        uint256[] tokenIds;
        uint256[] amounts;
        uint256 nonce;
        address signer;
        bytes signature;
    }

    struct BurnData {
        address account;
        uint256[] tokenIds;
        uint256[] amounts;
    }

    struct Asset {
        string[] dataUri;
        uint256 version;
    }
    
    struct AssetUri {
        uint256 tokenId;
        string uri;
    }

    struct AssetRoyalties {
        uint256 tokenId;
        address royaltyReceiver;
        uint24 royaltyRate;
    }
    
    struct SystemApprovalPair {
        address operator;
        bool approved;
    }

    struct UniqueContentData {
        address creator;
        address contentContract;
        uint256 id;
        address royaltyReceiver;
        uint24 royaltyRate;
    }

    function hashMintData(MintData memory _data) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                MINT_DATA_TYPEHASH,
                _data.to,
                keccak256(abi.encodePacked(_data.tokenIds)),
                keccak256(abi.encodePacked(_data.amounts)),
                _data.nonce,
                _data.signer
            ));
    }
}