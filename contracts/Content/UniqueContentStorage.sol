// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MultipleRoyalties.sol";
import "./interfaces/IUniqueContentStorage.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";

contract UniqueContentStorage is IUniqueContentStorage, MultipleRoyalties {

    /***************** Stored Variables *****************/
    mapping(uint256 => LibAsset.UniqueAsset) uniqueAssetInfo;

    /******************** Public API ********************/
    function initialize() public initializer {
        __ERC165_init_unchained();
        __MultipleRoyalties_init_unchained();
        __UniqueContentStorage_init_unchained();
    }

    function __UniqueContentStorage_init_unchained() internal onlyInitializing {
        _registerInterface(type(IUniqueContentStorage).interfaceId);
    }

    /**
    * @dev Records the asset info of a newly minted Asset
    * @param _data LibAsset.UniqueAssetCreateData structure object
    * @param _uniqueId uint256 ID of token if the new asset
    * @param _creator the address of who called the mint function
    */
    function setUniqueAssetInfo(LibAsset.UniqueAssetCreateData memory _data, uint256 _uniqueId, address _creator) external override {
        uniqueAssetInfo[_uniqueId].creator = _creator;
        uniqueAssetInfo[_uniqueId].contentAddress = _data.contentAddress;
        uniqueAssetInfo[_uniqueId].tokenId = _data.tokenId;
        uniqueAssetInfo[_uniqueId].uniqueAssetUri.push(_data.uniqueAssetUri);
        uniqueAssetInfo[_uniqueId].creatorLocked = _data.creatorLocked;

        _setTokenRoyalties(_uniqueId, _data.royaltyReceivers, _data.royaltyRates);
    }

    /**
    * @dev Deletes the asset info of a burned token
    * @param _uniqueId uint256 ID of the token to be burned
    */
    function burnUniqueAssetInfo(uint256 _uniqueId) external override {
        uniqueAssetInfo[_uniqueId].creator = address(0);
        uniqueAssetInfo[_uniqueId].contentAddress = address(0);
        uniqueAssetInfo[_uniqueId].tokenId = 0;
        uniqueAssetInfo[_uniqueId].version = 0;
        uniqueAssetInfo[_uniqueId].creatorLocked = false;
        delete uniqueAssetInfo[_uniqueId].uniqueAssetUri;

        _deleteTokenRoyalties(_uniqueId);
    }

    /**
    * @dev Returns the unique asset uri of a specific version
    * @param _uniqueId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function tokenURI(uint256 _uniqueId, uint256 _version) external view override returns (string memory) {
        if (_version > uniqueAssetInfo[_uniqueId].version) {
            _version = uniqueAssetInfo[_uniqueId].version;
        } 
        return uniqueAssetInfo[_uniqueId].uniqueAssetUri[_version];
    }

    /**
    * @dev Records a new version of the unique asset
    * @param _uniqueId uint256 ID of the token to set its uri
    * @param _uri string URI to assign
    */
    function setUniqueUri(uint256 _uniqueId, string memory _uri) external override {
        uniqueAssetInfo[_uniqueId].uniqueAssetUri.push(_uri);
        uniqueAssetInfo[_uniqueId].version++;

        emit UniqueUriUpdated(_uniqueId, uniqueAssetInfo[_uniqueId].version);
    }

    /**
    * @dev Returns the original asset's receiver address and royalty amount for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function getRoyalty(uint256 _uniqueId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // calls royaltyInfo() in the original asset's contract
        (receiver, royaltyAmount) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, _salePrice);
    }

    /**
    * @dev Returns an array of receiver addresses and calculated royalty amounts for a token sold at a certain sales price
    * @param _uniqueId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function getMultipleRoyalties(uint256 _uniqueId, uint256 _salePrice) external view override returns (address[] memory receivers, uint256[] memory royaltyAmounts) {
        // grab the original item's royalty info
        // note: we assume here that the original royalty rate of the asset is less than or equal to 100 percent
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
        // if it's greater than 20 percent ignore the remaining royalties
        if (_originalRoyaltyRate > 2e5) {}
        else if (LibRoyalty.verifyRoyalties(_receivers, _rates, _originalRoyaltyRate)) {
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
    }

    /**
     * @dev If the given royalties are valid, it sets a unique asset's royalties
     * @param _uniqueId uint256 ID of the unique asset to set the royalties of
     * @param _royaltyReceivers addresses to receive the royalties
     * @param _royaltyRates royalty fee percentages
     */
    function setTokenRoyalties(uint256 _uniqueId, address[] memory _royaltyReceivers, uint24[] memory _royaltyRates) external override {
        (, uint256 _originalRoyaltyRate) = IERC2981Upgradeable(uniqueAssetInfo[_uniqueId].contentAddress).royaltyInfo(uniqueAssetInfo[_uniqueId].tokenId, 1e6);
        require(LibRoyalty.verifyRoyalties(_royaltyReceivers, _royaltyRates, _originalRoyaltyRate), "Error: royalties are invalid");

        _setTokenRoyalties(_uniqueId, _royaltyReceivers, _royaltyRates);
    }

    /**
     * @dev Verifies whether the caller is the creator of this token
     * @param _uniqueId uint256 ID of the token to query
     * @param _caller address to be vetted
     */
    function isCreator(uint256 _uniqueId, address _caller) external view override returns (bool) {
        return uniqueAssetInfo[_uniqueId].creator == _caller;
    }

    /**
     * @dev Verifies whether the unique asset is creator locked
     * @param _uniqueId uint256 ID of the token to query
     */
    function isLocked(uint256 _uniqueId) external view override returns (bool) {
        return uniqueAssetInfo[_uniqueId].creatorLocked;
    }

    /**
     * @dev Returns the original token Id and content address of a unique asset
     * @param _uniqueId uint256 ID of token to query
     */
    function getAssetData(uint256 _uniqueId) external view override returns (uint256 tokenId, address contentAddress) {
        tokenId = uniqueAssetInfo[_uniqueId].tokenId;
        contentAddress = uniqueAssetInfo[_uniqueId].contentAddress;
    }

    uint256[50] private __gap;
}