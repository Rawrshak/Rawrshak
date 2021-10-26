// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "./interfaces/IContent.sol";
import "./interfaces/IAccessControlManager.sol";
import "./interfaces/IContentStorage.sol";
import "hardhat/console.sol";

contract Content is IContent, IERC2981Upgradeable, ERC1155Upgradeable, ERC165StorageUpgradeable {
    /******************** Constants ********************/
    /*
     * ERC1155 interface == 0xd9b67a26
     * IContent == 0x6a3af2b5
     * IContractUri == 0xc0e24d5e
     * IERC2981Upgradeable == 0x2a55205a
     */

    /***************** Stored Variables *****************/
    IContentStorage contentStorage;
    IAccessControlManager accessControlManager;

    /******************** Public API ********************/
    function initialize(
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
        _registerInterface(type(IContent).interfaceId);
        _registerInterface(type(IERC2981Upgradeable).interfaceId);
        _registerInterface(type(IContractUri).interfaceId);

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
        uint256 version = contentStorage.getLatestUriVersion(_tokenId, true);
        return this.uri(_tokenId, version);
    }

    function uri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        return contentStorage.uri(_tokenId, _version);
    }
    
    function totalSupply(uint256 _tokenId) external view override returns (uint256) {
        return _supply(_tokenId);
    }
    
    function maxSupply(uint256 _tokenId) external view override returns (uint256) {
        return _maxSupply(_tokenId);
    }

    function contractRoyalty() external view override returns (address receiver, uint24 rate) {
        return contentStorage.getContractRoyalty();
    }
    
    function userMintNonce(address _user) external view override returns (uint256) {
        return accessControlManager.userMintNonce(_user);
    }
    
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // Get the Royalties from the content storage.
        uint24 rate = 0;
        (receiver, rate) = contentStorage.getRoyalty(_tokenId);
        
        royaltyAmount = _salePrice * rate / 1e6;
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