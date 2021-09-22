// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "../libraries/LibRoyalties.sol";
import "../utils/LibInterfaces.sol";
import "./interfaces/IContent.sol";
import "./interfaces/IAccessControlManager.sol";
import "./interfaces/IContentStorage.sol";
import "./interfaces/IERC2981.sol";

contract Content is IContent, IERC2981, ERC1155Upgradeable, ERC165StorageUpgradeable {
    /******************** Constants ********************/
    /*
     * ERC1155 interface == 0xd9b67a26
     * IContractUri == 0xc0e24d5e
     * IRoyaltyProvider == 0xbb3bafd6
     * bytes4(keccak256('totalSupply(uint256)')) == 0x35403023 // Todo: update this
     * bytes4(keccak256('maxSupply(uint256)')) == 0x869f7594
     * bytes4(keccak256('uri(uint256,uint256)')) == 0xbe234d42
     * bytes4(keccak256('mintBatch(LibAsset.MintData memory)')) == 0x9791d37a
     * bytes4(keccak256('burnBatch(LibAsset.BurnData memory)')) == 0xa0a862d5
     *      => 98AA21F4
     */

    /***************** Stored Variables *****************/
    IContentStorage contentStorage;
    IAccessControlManager accessControlManager;

    /******************** Public API ********************/
    function __Content_init(
        address _contentStorage,
        address _accessControlManager)
        public initializer
    {
        // __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained("");
        __Content_init_unchained(_contentStorage, _accessControlManager);
    }

    function __Content_init_unchained(
        address _contentStorage,
        address _accessControlManager)
        internal initializer
    {
        _registerInterface(LibInterfaces.INTERFACE_ID_CONTENT);
        _registerInterface(LibInterfaces.INTERFACE_ID_ERC2981);

        contentStorage = IContentStorage(_contentStorage);
        accessControlManager = IAccessControlManager(_accessControlManager);
    }

    // Asset Minting
    function mintBatch(LibAsset.MintData memory _data) external override {
        accessControlManager.verifyMint(_data, _msgSender());
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            require(
                _maxSupply(_data.tokenIds[i]) >= _supply(_data.tokenIds[i]) + _data.amounts[i],
                "Max Supply reached"
            );

            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]) + _data.amounts[i]);
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
        emit Mint(_msgSender(), _data);
    }

    // Asset Burning
    function burnBatch(LibAsset.BurnData memory _data) external override {
        require(_data.account == _msgSender() || isApprovedForAll(_data.account, _msgSender()), "Caller is not approved.");

        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]) - _data.amounts[i]);
        }

        _burnBatch(_data.account, _data.tokenIds, _data.amounts);
        emit Burn(_msgSender(), _data);
    }

    // CONTRACT URI
    function contractUri() external view override returns (string memory) {
        return contentStorage.contractUri();
    }

    // TOKEN URIS
    function uri(uint256 _tokenId) public view override returns (string memory) {
        uint256 version = HasTokenUri(address(contentStorage)).getLatestUriVersion(_tokenId, true);
        return this.uri(_tokenId, version);
    }

    function uri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        return contentStorage.uri(_tokenId, _version);
    }
    
    // Royalties
    function getRoyalties(uint256 _tokenId) external view override returns (LibRoyalties.Fees[] memory) {
        return contentStorage.getRoyalties(_tokenId);
    }
    
    function totalSupply(uint256 _tokenId) external view override returns (uint256) {
        return _supply(_tokenId);
    }
    
    function maxSupply(uint256 _tokenId) external view override returns (uint256) {
        return _maxSupply(_tokenId);
    }
    
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // Get the Royalties from the content storage.
        LibRoyalties.Fees[] memory fees = contentStorage.getRoyalties(_tokenId);
        
        // There may be more than one royalty recipient, however, ERC2981 only has one receiver. So we will only 
        // the first fee (receiver and rate). The developer must know that this if this asset is sold outside
        // of the Rawrshak exchange, only the first royalty will be paid.
        if (fees.length > 0) {
            royaltyAmount = _salePrice * fees[0].rate / 1e6;
            receiver = fees[0].account;
        }
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/
    function _supply(uint256 _tokenId) internal view returns(uint256) {
        return contentStorage.supply(_tokenId);
    }

    function _maxSupply(uint256 _tokenId) internal view returns(uint256) {
        return contentStorage.maxSupply(_tokenId);
    }

    function _tokenExists(uint256 _tokenId) internal view returns(bool) {
        return contentStorage.ids(_tokenId);
    }

    function _updateSupply(uint256 _tokenId, uint256 _newSupply) internal {
        return contentStorage.updateSupply(_tokenId, _newSupply);
    }

    uint256[50] private __gap;
}