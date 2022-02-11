// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "./interfaces/IMultipleRoyalties.sol";
import "./interfaces/IUniqueContent.sol";
import "./interfaces/IUniqueContentStorage.sol";
import "./interfaces/IContent.sol";

contract UniqueContent is IUniqueContent, IMultipleRoyalties, ERC721Upgradeable, ERC1155HolderUpgradeable, IERC2981Upgradeable, ERC165StorageUpgradeable {

    /***************** Stored Variables *****************/
    IUniqueContentStorage uniqueContentStorage;
    uint256 private uniqueIdsCounter;

    function initialize(
        address _uniqueContentStorage)
        public initializer
    {
        _registerInterface(type(IMultipleRoyalties).interfaceId);
        _registerInterface(type(IERC2981Upgradeable).interfaceId);

        uniqueContentStorage = IUniqueContentStorage(_uniqueContentStorage);
    }
    
    /** Asset Minting
    * @dev If the royalties are valid and if the caller has the original item in their wallet, it takes the original asset, mints the unique asset and updates mappings
    * @param _data LibAsset.UniqueAssetCreateData structure object
    */
    function mint(LibAsset.UniqueAssetCreateData memory _data) external override {
        require((IERC1155Upgradeable(_data.contentAddress).balanceOf(_msgSender(), _data.tokenId)) >= 1, "You must have the original item in your wallet");
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(_data.contentAddress).royaltyInfo(_data.tokenId, 1e6);
        require(uniqueContentStorage.verifyRoyalties(_data.royaltyReceivers, _data.royaltyRates, _originalRoyaltyRate), "The royalties entered are invalid");
        // transfers the original asset to be locked in the unique content contract
        IERC1155Upgradeable(_data.contentAddress).safeTransferFrom(_msgSender(), address(this), _data.tokenId, 1, "");
        // mint() is a mint and transfer function, if _data.to != msgSender, the caller would be sending the token to someone else
        _mint(_data.to, uniqueIdsCounter);

        uniqueContentStorage.setUniqueAssetInfo(_data, uniqueIdsCounter, _msgSender());
        
        emit Mint(uniqueIdsCounter, _msgSender(), _data);

        // increment uniqueIdsCounter for next minting process
        uniqueIdsCounter++;
    }

    /** Asset Burning
    * @dev If the caller is the owner of the token and if the unique asset is not creator locked (or the caller is the creator), it burns the unique asset, returns the original asset, and then deletes the unique asset's token info
    * @param _uniqueId uint256 ID of token to burn
    */
    function burn(uint256 _uniqueId) external override {
        require(ownerOf(_uniqueId) == _msgSender(), "You must be the owner of this token to burn it");
        require(uniqueContentStorage.isCreator(_uniqueId, _msgSender()) || !uniqueContentStorage.isLocked(_uniqueId), "Creator has disabled the burning of this token");
        _burn(_uniqueId);
        // transfers original asset back to caller
        (uint256 _tokenId, address _contentAddress) = uniqueContentStorage.getAssetData(_uniqueId);
        IERC1155Upgradeable(_contentAddress).safeTransferFrom(address(this), _msgSender(), _tokenId, 1, "");
        
        uniqueContentStorage.burnUniqueAssetInfo(_uniqueId);
        
        emit Burn(_uniqueId, _msgSender());
    }

    /**
    * @dev Returns the uri of a specific version of the original asset the unique asset is based on
    * @param _uniqueId uint256 ID of token to query original asset uri of
    * @param _version version number of token to query
    */
    function originalAssetUri(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        (uint256 _tokenId, address _contentAddress) = uniqueContentStorage.getAssetData(_uniqueId);
        return IContent(_contentAddress).uri(_tokenId, _version);
    }

    /**
    * @dev Returns the unique asset uri of a specific version
    * @param _uniqueId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function tokenURI(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        return uniqueContentStorage.tokenURI(_uniqueId, _version);
    }

    /**
    * @dev Returns the latest version of the unique asset uri
    * @param _uniqueId uint256 ID of token to query
    */
    function tokenURI(uint256 _uniqueId) public view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        return uniqueContentStorage.tokenURI(_uniqueId, type(uint256).max);
    }

    /**
    * @dev If the caller is creator and owner of the token, it adds a new version of the unique asset
    * @param _uniqueId uint256 ID of the token that gets a new uri
    * @param _uri string URI to assign
    */
    function setUniqueUri(uint256 _uniqueId, string memory _uri) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(ownerOf(_uniqueId) == _msgSender(), "You must be the owner of this token to set its uri");
        require(uniqueContentStorage.isCreator(_uniqueId, _msgSender()), "You are not the creator of this token");
        uniqueContentStorage.setUniqueUri(_uniqueId, _uri);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function royaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount){
        require(_exists(_uniqueId), "Unique Id does not exist");
        (receiver, royaltyAmount) = uniqueContentStorage.getRoyalty(_uniqueId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and royalty amounts for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function multipleRoyaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        (receivers, royaltyAmounts) = uniqueContentStorage.getMultipleRoyalties(_uniqueId, _salePrice);
    }

    /**
     * @dev If the caller is the creator of the token, and the royalties are valid, it sets a specific token's royalties
     * @param _uniqueId uint256 ID of the token to set royalties of
     * @param _royaltyReceivers array of addresses to receive the royalties
     * @param _royaltyRates array of royalty fee percentages
     */
    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(uniqueContentStorage.isCreator(_uniqueId, _msgSender()), "You are not the creator of this token");
        uniqueContentStorage.setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable, ERC1155ReceiverUpgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}