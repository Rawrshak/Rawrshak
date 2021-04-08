// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./SystemsApproval.sol";
import "./LibRoyalties.sol";
import "../utils/Constants.sol";


contract Content is Ownable, HasContractURI, HasTokenURI, HasRoyalties, SystemsApproval, ERC1155Burnable {
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('setContractURI(string memory)')) == 0x5b54d3f4
     * bytes4(keccak256('uri(uint256)')) == 0x0e89341c
     * bytes4(keccak256('setContractRoyalties(LibRoyalties.Fees[] memory)')) == 0xa2de9fbe
     * bytes4(keccak256('setTokenRoyalties(uint256, LibRoyalties.Fees[] memory)')) == 0x170ea8e3
     * bytes4(keccak256('setSystemApproval(LibAsset.SystemApprovalPair[] memory)')) == 2d24632d
     * bytes4(keccak256('isApprovedForAll(address, address)')) == 0x3a95ab7f
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     */

    /***************** Stored Variables *****************/
    string public name;
    string public symbol;

    // todo: moving supply and maxSupply into LibAsset.Asset may be more efficient?
    mapping(uint256 => bool) private ids;
    mapping(uint256 => uint256) private maxSupply;
    mapping(uint256 => uint256) private supply;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        string memory _tokenUriPrefix,
        LibRoyalties.Fees[] memory _contractFees)
        HasContractURI(_contractUri)
        HasTokenURI(_tokenUriPrefix)
        HasRoyalties(_contractFees)
        ERC1155("")
    {
        name = _name;
        symbol = _symbol;

        // register the supported interface to conform to the ERC1155
        // _registerInterface(Constants._INTERFACE_ID_CONTENT);
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        _setContractURI(_contractURI);
    }
    
    function uri(uint256 _tokenId) public view override returns (string memory) {
        return _tokenURI(_tokenId, getLatestTokenVersion(_tokenId));
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external onlyOwner {
        _setContractRoyalties(_fee);
    }

    function setTokenRoyalties(uint256 _tokenId, LibRoyalties.Fees[] memory _fees) external onlyOwner {
        _setTokenRoyalties(_tokenId, _fees);
    }

    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) external onlyOwner {
        _setSystemApproval(_operators);
    }

    function isApprovedForAll(address _owner, address _operator) public override(SystemsApproval, ERC1155) view returns (bool) {
        return SystemsApproval.isApprovedForAll(_owner, _operator);
    }

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external onlyOwner {
        LibAsset.validateAddAssetData(ids, _assets);
        for (uint256 i = 0; i < _assets.length; ++i) {
            _setTokenUri(_assets[i].tokenId, _assets[i].dataUri);
            
            // max supply can be 0. If max supply is 0, then this asset has no supply cap and can be
            // continuously minted.
            supply[_assets[i].tokenId] = 0;
            maxSupply[_assets[i].tokenId] = _assets[i].maxSupply;

            // if this specific token has a different royalty fees than the contract
            if (_assets[i].fees.length != 0) {
                _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
            }
        }

        // emit event
    }

    // // todo: upgrade to updateAssetBatch()
    // // todo: move this into addAssetBatch()
    // function updateAsset(uint256 _tokenId, string memory _uri) public onlyOwner {
    //     LibAsset.validateTokenId(ids, _tokenId);
    //     // note: uri can be set to null
    //     _setTokenUri(_tokenId, _uri);

    //     // emit event
    // }

    function mintBatch(LibAsset.MintData memory _data) external onlyOwner {
        LibAsset.validateMintData(ids, maxSupply, supply, _data);

        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            supply[_data.tokenIds[i]] = SafeMath.add(supply[_data.tokenIds[i]], _data.amounts[i]);
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
    }

    function getSupplyInfo(uint256 _tokenId) external view returns (uint256 supplyRetVal, uint256 maxSupplyRetVal) {
        supplyRetVal = supply[_tokenId];
        maxSupplyRetVal = maxSupply[_tokenId];
    }
}