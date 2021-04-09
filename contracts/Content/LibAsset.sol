// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./LibRoyalties.sol";

library LibAsset {

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
                _maxSupply[_data.tokenIds[i]] >= SafeMathUpgradeable.add(_supply[_data.tokenIds[i]], _data.amounts[i]), "Max Supply reached"
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

}