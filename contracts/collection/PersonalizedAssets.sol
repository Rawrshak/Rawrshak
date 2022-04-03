// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/utils/ERC721HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/IERC1155MetadataURIUpgradeable.sol";
import "./interfaces/IMultipleRoyalties.sol";
import "./interfaces/IPersonalizedAssets.sol";
import "./interfaces/IPersonalizedAssetsStorage.sol";
import "./interfaces/ICollection.sol";
import "../libraries/LibRoyalty.sol";

contract PersonalizedAssets is IPersonalizedAssets, IMultipleRoyalties, ERC721Upgradeable, ERC1155HolderUpgradeable, ERC721HolderUpgradeable, IERC2981Upgradeable, ERC165StorageUpgradeable {

    using ERC165CheckerUpgradeable for address;
    
    /***************** Stored Variables *****************/
    IPersonalizedAssetsStorage personalizedAssetsStorage;
    uint256 private idsCounter;

    /******************** Public API ********************/
    function initialize(
        string memory _name,
        string memory _symbol,
        address _personalizedAssetsStorage)
        public initializer
    {
        __ERC165_init_unchained();
        __ERC721_init_unchained(_name, _symbol);
        __ERC721Holder_init_unchained();
        __ERC1155Holder_init_unchained();
        __PersonalizedAssets_init_unchained(_personalizedAssetsStorage);
    }

    function __PersonalizedAssets_init_unchained(
        address _personalizedAssetsStorage)
        internal onlyInitializing
    {
        _registerInterface(type(IPersonalizedAssets).interfaceId);
        _registerInterface(type(IERC2981Upgradeable).interfaceId);
        _registerInterface(type(IMultipleRoyalties).interfaceId);

        personalizedAssetsStorage = IPersonalizedAssetsStorage(_personalizedAssetsStorage);
    }
    
    /** Asset Minting
    * @dev If the royalties are valid and if the caller has the original item in their wallet, it takes the original asset, mints the personalized asset and updates mappings
    * @param _data LibAsset.PersonalizedAssetCreateData structure object
    */
    function mint(LibAsset.PersonalizedAssetCreateData memory _data) external override {
        require(
            (_data.collectionAddress.supportsInterface(type(IERC2981Upgradeable).interfaceId)) &&
            // avoids the possibility of creating a personalized asset out of a personalized asset
            !(_data.collectionAddress.supportsInterface(type(IPersonalizedAssets).interfaceId)) &&
            ((_data.collectionAddress.supportsInterface(type(IERC1155Upgradeable).interfaceId)) ||
            (_data.collectionAddress.supportsInterface(type(IERC721Upgradeable).interfaceId))),
            "Error: collection contract not supported"
        );
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(_data.collectionAddress).royaltyInfo(_data.tokenId, 1e6);
        require(LibRoyalty.verifyRoyalties(_data.royaltyReceivers, _data.royaltyRates, _originalRoyaltyRate), "Error: royalties are invalid");

        if (_data.collectionAddress.supportsInterface(type(IERC1155Upgradeable).interfaceId)) {
            require((IERC1155Upgradeable(_data.collectionAddress).balanceOf(_msgSender(), _data.tokenId)) >= 1, "Error: must have original item");
            // transfers the original asset to be locked in the personalized assets contract
            IERC1155Upgradeable(_data.collectionAddress).safeTransferFrom(_msgSender(), address(this), _data.tokenId, 1, "");

        } else {
            require((IERC721Upgradeable(_data.collectionAddress).ownerOf(_data.tokenId)) == _msgSender(), "Error: must have original item");
            // transfers the original asset to be locked in the personalized assets contract
            IERC721Upgradeable(_data.collectionAddress).safeTransferFrom(_msgSender(), address(this), _data.tokenId, "");
        }   
        personalizedAssetsStorage.setPersonalizedAssetInfo(_data, idsCounter, _msgSender());

        // mint() is a mint and transfer function, if _data.to != msgSender, the caller would be sending the token to someone else
        _mint(_data.to, idsCounter);
        
        emit Mint(idsCounter++, _msgSender(), _data);
    }

    /** Asset Burning
    * @dev If the caller is the owner of the token and if the personalized asset is not creator locked (or the caller is the creator), it burns the personalized asset, returns the original asset, and then deletes the personalized asset's token info
    * @param _paTokenId uint256 ID of token to burn
    */
    function burn(uint256 _paTokenId) external override {
        require(ownerOf(_paTokenId) == _msgSender(), "Error: sender not token owner");
        require(
            personalizedAssetsStorage.isCreator(_paTokenId, _msgSender()) ||
            !personalizedAssetsStorage.isLocked(_paTokenId),
            "Error: burning of token disabled"
        );
        _burn(_paTokenId);
        (uint256 _tokenId, address _collectionAddress) = personalizedAssetsStorage.getAssetData(_paTokenId);
        personalizedAssetsStorage.burnPersonalizedAssetInfo(_paTokenId);

        if (_collectionAddress.supportsInterface(type(IERC1155Upgradeable).interfaceId)) {
            // transfers original asset back to caller
            IERC1155Upgradeable(_collectionAddress).safeTransferFrom(address(this), _msgSender(), _tokenId, 1, "");
        } else {
            // transfers original asset back to caller
            IERC721Upgradeable(_collectionAddress).safeTransferFrom(address(this), _msgSender(), _tokenId, "");
        }
        emit Burn(_paTokenId, _msgSender());
    }

    /**
    * @dev Returns the uri of a specific version of the original asset the personalized asset is based on
    * @param _paTokenId uint256 ID of token to query original asset uri of
    * @param _version version number of token to query
    */
    function originalAssetUri(uint256 _paTokenId, uint256 _version) external view override returns (string memory uri) {
        require(_exists(_paTokenId), "Token Id does not exist");
        (uint256 _tokenId, address _collectionAddress) = personalizedAssetsStorage.getAssetData(_paTokenId);

        if (_collectionAddress.supportsInterface(type(ICollection).interfaceId)) {
            return ICollection(_collectionAddress).uri(_tokenId, _version);
        } else if (_collectionAddress.supportsInterface(type(IERC721MetadataUpgradeable).interfaceId)) {
            return IERC721MetadataUpgradeable(_collectionAddress).tokenURI(_tokenId);
        } else if (_collectionAddress.supportsInterface(type(IERC1155MetadataURIUpgradeable).interfaceId)) {
            return IERC1155MetadataURIUpgradeable(_collectionAddress).uri(_tokenId);
        }
    }

    /**
    * @dev Returns the personalized asset uri of a specific version
    * @param _paTokenId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function tokenURI(uint256 _paTokenId, uint256 _version) external view override returns (string memory) {
        require(_exists(_paTokenId), "Token Id does not exist");
        return personalizedAssetsStorage.tokenURI(_paTokenId, _version);
    }

    /**
    * @dev Returns the latest version of the personalized asset uri
    * @param _paTokenId uint256 ID of token to query
    */
    function tokenURI(uint256 _paTokenId) public view override returns (string memory) {
        require(_exists(_paTokenId), "Token Id does not exist");
        return personalizedAssetsStorage.tokenURI(_paTokenId, type(uint256).max);
    }

    /**
    * @dev If the caller is creator and owner of the token, it adds a new version of the personalized asset
    * @param _paTokenId uint256 ID of the token that gets a new uri
    * @param _uri string URI to assign
    */
    function setPersonalizedAssetUri(uint256 _paTokenId, string memory _uri) external override {
        require(_exists(_paTokenId), "Token Id does not exist");
        require(ownerOf(_paTokenId) == _msgSender(), "Error: sender not token owner");
        require(personalizedAssetsStorage.isCreator(_paTokenId, _msgSender()), "Error: sender not token creator");
        personalizedAssetsStorage.setPersonalizedAssetUri(_paTokenId, _uri);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _paTokenId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function royaltyInfo(uint256 _paTokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount){
        require(_exists(_paTokenId), "Token Id does not exist");
        (receiver, royaltyAmount) = personalizedAssetsStorage.getRoyalty(_paTokenId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and royalty amounts for a token sold at a certain sales price
    * @param _paTokenId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function multipleRoyaltyInfo(uint256 _paTokenId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        require(_exists(_paTokenId), "Token Id does not exist");
        (receivers, royaltyAmounts) = personalizedAssetsStorage.getMultipleRoyalties(_paTokenId, _salePrice);
    }

    /**
     * @dev If the caller is the creator of the token, and the royalties are valid, it sets a specific token's royalties
     * @param _paTokenId uint256 ID of the token to set royalties of
     * @param _royaltyReceivers array of addresses to receive the royalties
     * @param _royaltyRates array of royalty fee percentages
     */
    function setTokenRoyalties(uint256 _paTokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        require(_exists(_paTokenId), "Token Id does not exist");
        require(personalizedAssetsStorage.isCreator(_paTokenId, _msgSender()), "Error: sender not token creator");
        personalizedAssetsStorage.setTokenRoyalties(_paTokenId, _royaltyReceivers, _royaltyRates);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable, ERC1155ReceiverUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}