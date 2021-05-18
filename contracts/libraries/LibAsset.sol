// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "../libraries/LibRoyalties.sol";

library LibAsset {
    using SafeMathUpgradeable for uint256;

    bytes32 public constant MINT_DATA_TYPEHASH = keccak256("MintData(address to,uint256[] tokenIds,uint256[] amounts,uint256 nonce,address signer)");
        
    struct CreateData {
        uint256 tokenId;
        string dataUri;
        uint256 maxSupply;
        LibRoyalties.Fees[] fees;
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
        LibRoyalties.Fees[] fees;
    }
    
    struct SystemApprovalPair {
        address operator;
        bool approved;
    }

    struct UniqueContentData {
        address creator;
        address contentContract;
        uint256 id;
        string contractUri;
        LibRoyalties.Fees[] contractFees;
    }

    // Validate functions below are used to check the input to a function. This is to reduce 
    // contract size for the contracts that use them.
    function validateTokenId(
        mapping(uint256 => bool) storage _tokenIds,
        uint256 _tokenId
    ) internal view {
        require(_tokenIds[_tokenId], "Invalid Token Id");
    }

    function validateMintData(
        mapping(uint256 => bool) storage _tokenIds,
        mapping(uint256 => uint256) storage _maxSupply,
        mapping(uint256 => uint256) storage _supply,
        MintData memory _data
    ) internal view {
        require(_data.to != address(0), "Invalid address");
        require(_data.amounts.length == _data.tokenIds.length, "Input length mismatch");
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(_tokenIds[_data.tokenIds[i]] == true, "token id doesn't exist");
            require(_maxSupply[_data.tokenIds[i]] == 0 ||
                _maxSupply[_data.tokenIds[i]] >= _supply[_data.tokenIds[i]].add(_data.amounts[i]), "Max Supply reached"
            );
        }
    }

    function validateAddAssetData(
        mapping(uint256 => bool) storage _tokenIds,
        LibAsset.CreateData[] memory _assets
    ) internal view {
        // tokenId must be unique
        // uri can be null
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(_tokenIds[_assets[i].tokenId] == false, "Token Id already exists.");
        }
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

    // function validateMintSignatures(MintData memory _data) internal view {

    // }

}