// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "../libraries/LibAsset.sol";
import "./MultipleRoyalties.sol";
import "./interfaces/IMultipleRoyalties.sol";
import "./interfaces/IUniqueContent.sol";
import "./interfaces/IContent.sol";

contract UniqueContent is IUniqueContent, IMultipleRoyalties, MultipleRoyalties, ERC721Upgradeable, IERC1155ReceiverUpgradeable, IERC2981Upgradeable {

    /***************** Stored Variables *****************/
    mapping(uint256 => LibAsset.UniqueAsset) uniqueAssetInfo;
    uint256 uniqueIdsCounter;
    
    /** Asset Minting
    * @dev If the royalties are valid and if the caller has the original item in their wallet, it takes the original asset, mints the unique asset and updates mappings
    * @param _data LibAsset.UniqueAssetCreateData structure object
    */
    function mint(LibAsset.UniqueAssetCreateData memory _data) external override {
        _verifyRoyalties(_data.royaltyReceivers, _data.royaltyRates);
        require((IERC1155Upgradeable(_data.contentAddress).balanceOf(_data.to, _data.tokenId)) >= 1, "You must have the original item in your wallet");
        // transfers the original asset to be locked in the unique content contract
        IERC1155Upgradeable(_data.contentAddress).safeTransferFrom(_data.to, address(this), _data.tokenId, 1, "");
        _mint(_data.to, uniqueIdsCounter);
        
        uniqueAssetInfo[uniqueIdsCounter].creator = _msgSender();
        uniqueAssetInfo[uniqueIdsCounter].contentAddress = _data.contentAddress;
        uniqueAssetInfo[uniqueIdsCounter].tokenId = _data.tokenId;
        uniqueAssetInfo[uniqueIdsCounter].uniqueAssetUri.push(_data.uniqueAssetUri);
        uniqueAssetInfo[uniqueIdsCounter].creatorLocked = _data.creatorLocked;
        _setTokenRoyalties(uniqueIdsCounter, _data.royaltyReceivers, _data.royaltyRates);
        
        emit UniqueUriUpdated(uniqueIdsCounter, 0);
        emit Mint(_msgSender(), _data);

        // increment uniqueIdsCounter for next minting process
        uniqueIdsCounter++;
    }

    /** Asset Burning
    * @dev If the caller is the owner of the token and if the unique asset is not creator locked, it returns the original asset, burns the unique asset, and then deletes the unique asset's token info
    * @param _uniqueId uint256 ID of token to burn
    */
    function burn(uint256 _uniqueId) external override {
        require(ownerOf(_uniqueId) == _msgSender(), "You must be the owner of this token to burn it");
        require(!uniqueAssetInfo[_uniqueId].creatorLocked, "Creator has disabled the burning of this token");
        // transfers original asset back to caller
        IERC1155Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).safeTransferFrom(address(this), _msgSender(), uniqueAssetInfo[_uniqueId].tokenId, 1, "");
        _burn(_uniqueId);

        uniqueAssetInfo[_uniqueId].creator = address(0);
        uniqueAssetInfo[_uniqueId].contentAddress = address(0);
        uniqueAssetInfo[_uniqueId].tokenId = 0;
        uniqueAssetInfo[_uniqueId].version = 0;
        uniqueAssetInfo[_uniqueId].creatorLocked = false;
        delete uniqueAssetInfo[_uniqueId].uniqueAssetUri;
        delete tokenRoyalties[_uniqueId];
        
        emit Burn(_msgSender(), _uniqueId);
    }

    /**
    * @dev Returns the uri of a specific version of the original asset the unique asset is based on
    * @param _uniqueId uint256 ID of token to query original asset uri of
    * @param _version version number of token to query
    */
    function originalAssetUri(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        uint256 _tokenId = uniqueAssetInfo[_uniqueId].tokenId;
        return IContent(uniqueAssetInfo[_uniqueId].contentAddress).uri(_tokenId, _version);
    }

    /**
    * @dev Returns the unique asset uri of a specific version
    * @param _uniqueId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function uri(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        if (_version > uniqueAssetInfo[_uniqueId].version) {
            _version = uniqueAssetInfo[_uniqueId].version;
        } 
        return uniqueAssetInfo[_uniqueId].uniqueAssetUri[_version];
    }

    /**
    * @dev Adds a new version of the unique asset
    * @param _uniqueId uint256 ID of the token to set its uri
    * @param _uri string URI to assign
    */
    function setUniqueUri(uint256 _uniqueId, string memory _uri) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(uniqueAssetInfo[_uniqueId].creator == _msgSender(), "You are not the creator of this token");
        uniqueAssetInfo[_uniqueId].uniqueAssetUri.push(_uri);
        uint256 _version = ++uniqueAssetInfo[_uniqueId].version;

        emit UniqueUriUpdated(_uniqueId, _version);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function royaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount){
        require(_exists(_uniqueId), "Unique Id does not exist");
        // grabs the original asset's content contract address and tokenId
        address originalAddress = uniqueAssetInfo[_uniqueId].contentAddress;
        uint256 tokenId = uniqueAssetInfo[_uniqueId].tokenId;
        // calls royaltyInfo() in the original asset's contract
        (receiver, royaltyAmount) = IERC2981Upgradeable(originalAddress).royaltyInfo(tokenId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and royalty amounts for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function multipleRoyaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        uint24[] memory rates;
        // grabs the arrays of receivers and rates for the token
        (receivers, rates) = _getMultipleRoyalties(_uniqueId);
        // calculates royaltyAmount for each receiver and places them in an array
        royaltyAmounts = new uint256[](rates.length);
        for (uint256 i = 0; i < receivers.length; ++i) {
            royaltyAmounts[i] = _salePrice * rates[i] / 1e6;
        }
    }

    /**
     * @dev Sets a specific token's royalties
     * @param _uniqueId uint256 ID of the token to set royalties of
     * @param _royaltyReceivers array of addresses to receive the royalties
     * @param _royaltyRates array of royalty fee percentages
     */
    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(uniqueAssetInfo[_uniqueId].creator == _msgSender(), "You are not the creator of this token");
        _verifyRoyalties(_royaltyReceivers, _royaltyRates);
        delete tokenRoyalties[_uniqueId];
        _setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}