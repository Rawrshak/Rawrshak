// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MultipleRoyalties.sol";
import "./interfaces/IPersonalizedAssetsStorage.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

contract PersonalizedAssetsStorage is IPersonalizedAssetsStorage, MultipleRoyalties {

    /***************** Stored Variables *****************/
    mapping(uint256 => LibAsset.PersonalizedAsset) assetInfo;

    /******************** Public API ********************/
    function initialize() public initializer {
        __ERC165_init_unchained();
        __MultipleRoyalties_init_unchained();
        __PersonalizedAssetsStorage_init_unchained();
    }

    function __PersonalizedAssetsStorage_init_unchained() internal onlyInitializing {
        _registerInterface(type(IPersonalizedAssetsStorage).interfaceId);
    }

    /**
    * @dev Records the asset info of a newly minted Asset
    * @param _data LibAsset.PersonalizedAssetCreateData structure object
    * @param _paTokenId uint256 ID of token if the new asset
    * @param _creator the address of who called the mint function
    */
    function setPersonalizedAssetInfo(LibAsset.PersonalizedAssetCreateData memory _data, uint256 _paTokenId, address _creator) external override {
        assetInfo[_paTokenId].creator = _creator;
        assetInfo[_paTokenId].collectionAddress = _data.collectionAddress;
        assetInfo[_paTokenId].tokenId = _data.tokenId;
        assetInfo[_paTokenId].personalizedAssetUri.push(_data.personalizedAssetUri);
        assetInfo[_paTokenId].creatorLocked = _data.creatorLocked;

        _setTokenRoyalties(_paTokenId, _data.royaltyReceivers, _data.royaltyRates);
    }

    /**
    * @dev Deletes the asset info of a burned token
    * @param _paTokenId uint256 ID of the token to be burned
    */
    function burnPersonalizedAssetInfo(uint256 _paTokenId) external override {
        assetInfo[_paTokenId].creator = address(0);
        assetInfo[_paTokenId].collectionAddress = address(0);
        assetInfo[_paTokenId].tokenId = 0;
        assetInfo[_paTokenId].version = 0;
        assetInfo[_paTokenId].creatorLocked = false;
        delete assetInfo[_paTokenId].personalizedAssetUri;

        _deleteTokenRoyalties(_paTokenId);
    }

    /**
    * @dev Returns the unique asset uri of a specific version
    * @param _paTokenId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function tokenURI(uint256 _paTokenId, uint256 _version) external view override returns (string memory) {
        if (_version > assetInfo[_paTokenId].version) {
            _version = assetInfo[_paTokenId].version;
        } 
        return assetInfo[_paTokenId].personalizedAssetUri[_version];
    }

    /**
    * @dev Records a new version of the unique asset
    * @param _paTokenId uint256 ID of the token to set its uri
    * @param _uri string URI to assign
    */
    function setPersonalizedAssetUri(uint256 _paTokenId, string memory _uri) external override {
        assetInfo[_paTokenId].personalizedAssetUri.push(_uri);
        assetInfo[_paTokenId].version++;

        emit UniqueUriUpdated(_paTokenId, assetInfo[_paTokenId].version);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _paTokenId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function getRoyalty(uint256 _paTokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // calls royaltyInfo() in the original asset's contract
        (receiver, royaltyAmount) = IERC2981Upgradeable(assetInfo[_paTokenId].collectionAddress).royaltyInfo(assetInfo[_paTokenId].tokenId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and calculated royalty amounts for a token sold at a certain sales price
    * @param _paTokenId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function getMultipleRoyalties(uint256 _paTokenId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        // grab the original item's royalty info
        // note: we assume here that the original royalty rate of the asset is less than or equal to 100 percent
        (address _creator, uint256 _originalRoyaltyAmount) = IERC2981Upgradeable(assetInfo[_paTokenId].collectionAddress).royaltyInfo(assetInfo[_paTokenId].tokenId, _salePrice);

        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(assetInfo[_paTokenId].collectionAddress).royaltyInfo(assetInfo[_paTokenId].tokenId, 1e6);

        if (_originalRoyaltyRate < 2e5) {
            address[] memory _receivers;
            uint24[] memory _rates;
            // grabs the additional royalties set for the unique token and places them in provisional arrays
            (_receivers, _rates) = _getMultipleRoyalties(_paTokenId);
            uint256 length = _getTokenRoyaltiesLength(_paTokenId);

            receivers = new address[](length + 1);
            royaltyAmounts = new uint256[](length + 1);
            
            if (LibRoyalty.verifyRoyalties(_receivers, _rates, _originalRoyaltyRate)) {
            // calculates royaltyAmount for each receiver and adds their address and royalty into the two arrays
                for (uint256 i = 0; i < length; ++i) {
                    receivers[i + 1] = _receivers[i];
                    royaltyAmounts[i + 1] = _salePrice * _rates[i] / 1e6;
                }
            } else {
                // if the total royalties exceed 2e5, split the remainder proportionally to the remaining receivers
                uint256 sum;
                for (uint256 i = 0; i < length; ++i) {
                    sum += _rates[i];
                }
                for (uint256 i = 0; i < length; ++i) {
                    receivers[i + 1] = _receivers[i];
                    royaltyAmounts[i + 1] = (_salePrice * _rates[i] / 1e6) * (2e5 - _originalRoyaltyRate) / sum;
                }
            }
        } else {
            // if it's greater than 20 percent ignore the remaining royalties
            receivers = new address[](1);
            royaltyAmounts = new uint256[](1);
        }
        // adds the original creator address and royalty amount to arrays of receivers and royalty amounts
        receivers[0] = _creator;
        royaltyAmounts[0] = _originalRoyaltyAmount;
    }

    /**
     * @dev If the given royalties are valid, it sets a unique asset's royalties
     * @param _paTokenId uint256 ID of the unique asset to set the royalties of
     * @param _royaltyReceivers addresses to receive the royalties
     * @param _royaltyRates royalty fee percentages
     */
    function setTokenRoyalties(uint256 _paTokenId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(assetInfo[_paTokenId].collectionAddress).royaltyInfo(assetInfo[_paTokenId].tokenId, 1e6);
        require(LibRoyalty.verifyRoyalties(_royaltyReceivers, _royaltyRates, _originalRoyaltyRate), "Error: royalties are invalid");

        _setTokenRoyalties(_paTokenId, _royaltyReceivers, _royaltyRates);
    }

    /**
     * @dev Verifies whether the caller is the creator of this token
     * @param _paTokenId uint256 ID of the token to query
     * @param _caller address to be vetted
     */
    function isCreator(uint256 _paTokenId, address _caller) external view override returns (bool) {
        return assetInfo[_paTokenId].creator == _caller;
    }

    /**
     * @dev Verifies whether the unique asset is creator locked
     * @param _paTokenId uint256 ID of the token to query
     */
    function isLocked(uint256 _paTokenId) external view override returns (bool) {
        return assetInfo[_paTokenId].creatorLocked;
    }

    /**
     * @dev Returns the original token Id and collection address of a unique asset
     * @param _paTokenId uint256 ID of token to query
     */
    function getAssetData(uint256 _paTokenId) external view override returns (uint256 tokenId, address collectionAddress) {
        tokenId = assetInfo[_paTokenId].tokenId;
        collectionAddress = assetInfo[_paTokenId].collectionAddress;
    }

    uint256[50] private __gap;
}