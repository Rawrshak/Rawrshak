// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./SystemsApproval.sol";
import "./LibRoyalties.sol";
import "../utils/Constants.sol";
import "./ContentStorage.sol";


contract Content is OwnableUpgradeable, SystemsApproval, ERC1155BurnableUpgradeable {
    
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
    address contentStorage;

    mapping(uint256 => bool) private ids;
    mapping(uint256 => uint256) public maxSupply;
    mapping(uint256 => uint256) public supply;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    function __Content_init(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        address _contentStorage)
        external initializer
    {
        __Ownable_init_unchained();
        __ERC1155Burnable_init_unchained();
        __ERC1155_init_unchained(_contractUri);
        name = _name;
        symbol = _symbol;
        contentStorage = _contentStorage;
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        _setURI(_contractURI);
    }
    
    function tokenURI(uint256 _tokenId, uint256 _version) external view returns (string memory) {
        return ContentStorage(contentStorage).tokenURI(_tokenId, _version);
    }
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) {
        return ContentStorage(contentStorage).getRoyalties(_tokenId);
    }

    function isApprovedForAll(address _owner, address _operator) public override(SystemsApproval, ERC1155Upgradeable) view returns (bool) {
        return SystemsApproval.isApprovedForAll(_owner, _operator);
    }

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external onlyOwner {
        // LibAsset.validateAddAssetData(ids, _assets);
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId] == false, "Token Id already exists.");
            ids[_assets[i].tokenId] = true;
            // max supply can be 0. If max supply is 0, then this asset has no supply cap and can be
            // continuously minted.
            supply[_assets[i].tokenId] = 0;
            maxSupply[_assets[i].tokenId] = _assets[i].maxSupply;
        }

        // emit event
    }

    function mintBatch(LibAsset.MintData memory _data) external onlyOwner {
        // LibAsset.validateMintData(ids, maxSupply, supply, _data);
        require(_data.to != address(0), "Invalid address");
        require(_data.amounts.length == _data.tokenIds.length, "Input length mismatch");
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(ids[_data.tokenIds[i]] == true, "token id doesn't exist");
            require(maxSupply[_data.tokenIds[i]] == 0 ||
                maxSupply[_data.tokenIds[i]] >= SafeMath.add(supply[_data.tokenIds[i]], _data.amounts[i]), "Max Supply reached"
            );
            supply[_data.tokenIds[i]] = SafeMathUpgradeable.add(supply[_data.tokenIds[i]], _data.amounts[i]);
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
    }


    
    uint256[50] private __gap;
}