// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "../libraries/LibAsset.sol";
import "./MultipleRoyalties.sol";
import "./interfaces/IMultipleRoyalties.sol";
import "./interfaces/IUniqueContent.sol";
import "./interfaces/IContent.sol";

contract UniqueContent is IUniqueContent, IMultipleRoyalties, MultipleRoyalties, ERC721Upgradeable, ERC1155HolderUpgradeable, IERC2981Upgradeable {

    /***************** Stored Variables *****************/
    mapping(uint256 => LibAsset.UniqueAsset) uniqueAssetInfo;
    uint256 private uniqueIdsCounter;
    
    /** Asset Minting
    * @dev If the royalties are valid and if the caller has the original item in their wallet, it takes the original asset, mints the unique asset and updates mappings
    * @param _data LibAsset.UniqueAssetCreateData structure object
    */
    function mint(LibAsset.UniqueAssetCreateData memory _data) external override {
        require((IERC1155Upgradeable(_data.contentAddress).balanceOf(_msgSender(), _data.tokenId)) >= 1, "You must have the original item in your wallet");
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(_data.contentAddress).royaltyInfo(_data.tokenId, 1e6);
        require(_verifyRoyalties(_data.royaltyReceivers, _data.royaltyRates, _originalRoyaltyRate), "The royalties entered are invalid");
        // transfers the original asset to be locked in the unique content contract
        IERC1155Upgradeable(_data.contentAddress).safeTransferFrom(_msgSender(), address(this), _data.tokenId, 1, "");
        // mint() is a mint and transfer function, if _data.to != msgSender, the caller would be sending the token to someone else
        _mint(_data.to, uniqueIdsCounter);
        
        uniqueAssetInfo[uniqueIdsCounter].creator = _msgSender();
        uniqueAssetInfo[uniqueIdsCounter].contentAddress = _data.contentAddress;
        uniqueAssetInfo[uniqueIdsCounter].tokenId = _data.tokenId;
        uniqueAssetInfo[uniqueIdsCounter].uniqueAssetUri.push(_data.uniqueAssetUri);
        uniqueAssetInfo[uniqueIdsCounter].creatorLocked = _data.creatorLocked;
        _setTokenRoyalties(uniqueIdsCounter, _data.royaltyReceivers, _data.royaltyRates);
        
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
        require(uniqueAssetInfo[_uniqueId].creator == _msgSender() || !uniqueAssetInfo[_uniqueId].creatorLocked, "Creator has disabled the burning of this token");
        _burn(_uniqueId);
        // transfers original asset back to caller
        IERC1155Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).safeTransferFrom(address(this), _msgSender(), uniqueAssetInfo[_uniqueId].tokenId, 1, "");
        
        uniqueAssetInfo[_uniqueId].creator = address(0);
        uniqueAssetInfo[_uniqueId].contentAddress = address(0);
        uniqueAssetInfo[_uniqueId].tokenId = 0;
        uniqueAssetInfo[_uniqueId].version = 0;
        uniqueAssetInfo[_uniqueId].creatorLocked = false;
        delete uniqueAssetInfo[_uniqueId].uniqueAssetUri;
        _deleteTokenRoyalties(_uniqueId);
        
        emit Burn(_uniqueId, _msgSender());
    }

    /**
    * @dev Returns the uri of a specific version of the original asset the unique asset is based on
    * @param _uniqueId uint256 ID of token to query original asset uri of
    * @param _version version number of token to query
    */
    function originalAssetUri(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        return IContent(uniqueAssetInfo[_uniqueId].contentAddress).uri(uniqueAssetInfo[_uniqueId].tokenId, _version);
    }

    /**
    * @dev Returns the unique asset uri of a specific version
    * @param _uniqueId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function tokenURI(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        if (_version > uniqueAssetInfo[_uniqueId].version) {
            _version = uniqueAssetInfo[_uniqueId].version;
        } 
        return uniqueAssetInfo[_uniqueId].uniqueAssetUri[_version];
    }

    /**
    * @dev Returns the latest version of the unique asset uri
    * @param _uniqueId uint256 ID of token to query
    */
    function tokenURI(uint256 _uniqueId) public view override returns (string memory) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        return uniqueAssetInfo[_uniqueId].uniqueAssetUri[uniqueAssetInfo[_uniqueId].version];
    }

    /**
    * @dev If the caller is creator and owner of the token, it adds a new version of the unique asset
    * @param _uniqueId uint256 ID of the token to set its uri
    * @param _uri string URI to assign
    */
    function setUniqueUri(uint256 _uniqueId, string memory _uri) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(uniqueAssetInfo[_uniqueId].creator == _msgSender(), "You are not the creator of this token");
        require(ownerOf(_uniqueId) == _msgSender(), "You must be the owner of this token to set its uri");
        uniqueAssetInfo[_uniqueId].uniqueAssetUri.push(_uri);
        uniqueAssetInfo[_uniqueId].version++;

        emit UniqueUriUpdated(_uniqueId, uniqueAssetInfo[_uniqueId].version);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function royaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount){
        require(_exists(_uniqueId), "Unique Id does not exist");
        // calls royaltyInfo() in the original asset's contract
        (receiver, royaltyAmount) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and royalty amounts for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function multipleRoyaltyInfo(uint256 _uniqueId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        require(_exists(_uniqueId), "Unique Id does not exist");
        // grabs the original item's royalty info
        (address _creator, uint256 _originalRoyaltyAmount) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, _salePrice);
        
        address[] memory _receivers;
        uint24[] memory _rates;
        // grabs the additional royalties set for the unique token and places them in provisional arrays
        (_receivers, _rates) = _getMultipleRoyalties(_uniqueId);
        uint256 length = _getTokenRoyaltiesLength(_uniqueId);
        
        receivers = new address[](length + 1);
        royaltyAmounts = new uint256[](length + 1);
        // adds the original creator address and royalty amount to arrays of receivers and royalty amounts
        receivers[0] = _creator;
        royaltyAmounts[0] = _originalRoyaltyAmount;

        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, 1e6);
        // calculates royaltyAmount for each receiver and adds their address and royalty into the two arrays
        if (_verifyRoyalties(_receivers, _rates, _originalRoyaltyRate)) {
            for (uint256 i = 0; i < length; ++i) {
                receivers[i + 1] = _receivers[i];
                royaltyAmounts[i + 1] = _salePrice * _rates[i] / 1e6;
            }
        } else {
            // if the total royalties exceed 1e6, split the remainder proportionally to the remaining receivers
            uint256 sum;
            for (uint256 i = 0; i < length; ++i) {
                sum += _rates[i];
            }
            for (uint256 i = 0; i < length; ++i) {
                receivers[i + 1] = _receivers[i];
                royaltyAmounts[i + 1] = (_salePrice * _rates[i] / 1e6) * (1e6 - _originalRoyaltyAmount) / sum;
            }
        }
    }

    /**
     * @dev If the caller is the creator of the token, and the royalties are valid, it sets a specific token's royalties
     * @param _uniqueId uint256 ID of the token to set royalties of
     * @param _royaltyReceivers array of addresses to receive the royalties
     * @param _royaltyRates array of royalty fee percentages
     */
    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        require(_exists(_uniqueId), "Unique Id does not exist");
        require(uniqueAssetInfo[_uniqueId].creator == _msgSender(), "You are not the creator of this token");
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, 1e6);
        require(_verifyRoyalties(_royaltyReceivers, _royaltyRates, _originalRoyaltyRate), "The royalties you have entered are invalid");

        _setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    uint256[50] private __gap;
}