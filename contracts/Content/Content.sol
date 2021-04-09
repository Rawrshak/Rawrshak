// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./LibRoyalties.sol";
import "./ContentStorage.sol";


contract Content is OwnableUpgradeable, ERC1155BurnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('setContractUri(string memory)')) == 0x5b54d3f4
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
    event AssetsAdded(LibAsset.CreateData[] assets);

    /******************** Public API ********************/
    function __Content_init(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        address _contentStorage)
        public initializer
    {
        __Ownable_init_unchained();
        __ERC1155Burnable_init_unchained();
        __ERC1155_init_unchained(_contractUri);
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT);
        name = _name;
        symbol = _symbol;
        
        require(_contentStorage.isContract(), "Address is not a contract.");
        require(_contentStorage.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE), "Address is not a Content Storage Contract");
        // require(_contentStorage.isContract() && 
        //         _contentStorage.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE),
        //         "Invalid Address");
        contentStorage = _contentStorage;
    }

    function setContractUri(string memory _contractUri) public onlyOwner {
        _setURI(_contractUri);
    }
    
    function tokenUri(uint256 _tokenId, uint256 _version) external view returns (string memory) {
        return ContentStorage(contentStorage).tokenUri(_tokenId, _version);
    }
    
    function getRoyalties(uint256 _tokenId) external view returns (LibRoyalties.Fees[] memory) {
        return ContentStorage(contentStorage).getRoyalties(_tokenId);
    }

    function isApprovedForAll(address _owner, address _operator) public override(ERC1155Upgradeable) view returns (bool) {
        return ContentStorage(contentStorage).isOperatorApprovedForAll(_operator)|| super.isApprovedForAll(_owner, _operator);
    }

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external onlyOwner {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId] == false, "Token Id already exists.");
            ids[_assets[i].tokenId] = true;
            // max supply can be 0. If max supply is 0, then this asset has no supply cap and can be
            // continuously minted.
            supply[_assets[i].tokenId] = 0;
            maxSupply[_assets[i].tokenId] = _assets[i].maxSupply;
        }

        emit AssetsAdded(_assets);
    }

    function mintBatch(LibAsset.MintData memory _data) external onlyOwner {
        // require(_data.to != address(0) && 
        //         _data.amounts.length == _data.tokenIds.length,
        //         "Invalid data input");
        require(_data.to != address(0), "Invalid address");
        require(_data.amounts.length == _data.tokenIds.length, "Input length mismatch");
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            // require(ids[_data.tokenIds[i]] && 
            //         (maxSupply[_data.tokenIds[i]] == 0 ||
            //             maxSupply[_data.tokenIds[i]] >= SafeMathUpgradeable.add(supply[_data.tokenIds[i]], _data.amounts[i])),
            //     "Invalid data input");
            require(ids[_data.tokenIds[i]] == true, "token id doesn't exist");
            require(maxSupply[_data.tokenIds[i]] == 0 ||
                maxSupply[_data.tokenIds[i]] >= SafeMathUpgradeable.add(supply[_data.tokenIds[i]], _data.amounts[i]), "Max Supply reached"
            );
            supply[_data.tokenIds[i]] = SafeMathUpgradeable.add(supply[_data.tokenIds[i]], _data.amounts[i]);
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    uint256[50] private __gap;
}