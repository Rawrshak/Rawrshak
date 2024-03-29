// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "./interfaces/ICollection.sol";
import "./interfaces/IAccessControlManager.sol";
import "./interfaces/ICollectionStorage.sol";
import "hardhat/console.sol";

contract Collection is ICollection, IERC2981Upgradeable, ERC1155Upgradeable, ERC165StorageUpgradeable {
    /******************** Constants ********************/
    /*
     * ERC1155 interface == 0xd9b67a26
     * ICollection == 0x79869ffe
     * IContractUri == 0xc0e24d5e
     * IERC2981Upgradeable == 0x2a55205a
     */

    /***************** Stored Variables *****************/
    ICollectionStorage collectionStorage;
    IAccessControlManager accessControlManager;

    /******************** Public API ********************/
    function initialize(
        address _collectionStorage,
        address _accessControlManager)
        public initializer
    {
        // __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained("");
        __Collection_init_unchained(_collectionStorage, _accessControlManager);
    }

    function __Collection_init_unchained(
        address _collectionStorage,
        address _accessControlManager)
        internal onlyInitializing
    {
        _registerInterface(type(ICollection).interfaceId);
        _registerInterface(type(IERC2981Upgradeable).interfaceId);
        _registerInterface(type(IContractUri).interfaceId);

        collectionStorage = ICollectionStorage(_collectionStorage);
        accessControlManager = IAccessControlManager(_accessControlManager);
    }

    /** Asset Minting
    * @dev Mints a batch of assets if the caller is verified, if the token exists, and if the max supply has not been reached.
    * @param _data LibAsset.MintData structure object
    */
    function mintBatch(LibAsset.MintData memory _data) external override {
        // verifies if the caller has the requisite permissions to mint
        accessControlManager.verifyMintDataAndIncrementNonce(_data, _msgSender());
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            // checks if the token exists
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            //checks that the max supply will not be reached through this minting
            require(
                _maxSupply(_data.tokenIds[i]) >= _supply(_data.tokenIds[i]) + _data.amounts[i],
                "Max Supply reached"
            );
            //updates total supply count
            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]) + _data.amounts[i]);
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
        emit Mint(_msgSender(), _data);
    }

    /** Asset Burning
    * @dev Burns a batch of assets if the caller is the owner or is approved by the owner, and if the tokens exist
    * @param _data LibAsset.BurnData structure object
    */
    function burnBatch(LibAsset.BurnData memory _data) external override {
        // checks whether the caller has permission to burn the assets
        require(_data.account == _msgSender() || (isApprovedForAll(_data.account, _msgSender()) && accessControlManager.isSystemContract(_msgSender())), "Caller is not approved.");

        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            // checks if the token exists
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            //updates total supply count
            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]) - _data.amounts[i]);
        }
        // burns the asset
        _burnBatch(_data.account, _data.tokenIds, _data.amounts);
        emit Burn(_msgSender(), _data);
    }

    // CONTRACT URI
    /**
    * @dev returns the contract uri
    */
    function contractUri() external view override returns (string memory) {
        return collectionStorage.contractUri();
    }

    // TOKEN URIS
    /**
    * @dev returns the latest uri for public token info
    * @param _tokenId uint256 ID of token to query
    */
    function uri(uint256 _tokenId) public view override returns (string memory) {
        return collectionStorage.uri(_tokenId, type(uint256).max);
    }

    /**
    * @dev returns the uri of a specific version for public token info 
    * @param _tokenId uint256 ID of token to query
    * @param _version version number of token to query
    */
    function uri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        return collectionStorage.uri(_tokenId, _version);
    }
    
    /**
    * @dev returns the total amount of a token currently in circulation
    * @param _tokenId uint256 ID of token to query
    */
    function totalSupply(uint256 _tokenId) external view override returns (uint256) {
        return _supply(_tokenId);
    }
    
    /**
    * @dev returns the largest amount of a token allowed to be in circulation
    * @param _tokenId uint256 ID of token to query
    */
    function maxSupply(uint256 _tokenId) external view override returns (uint256) {
        return _maxSupply(_tokenId);
    }

    /**
    * @dev returns the default royalty for the contract assets
    */
    function contractRoyalty() external view override returns (address receiver, uint24 rate) {
        return collectionStorage.getContractRoyalty();
    }
    
    /**
    * @dev returns the nonce of the user for this contract
    * @param _user address of the user whose nonce is being queried
    */
    function userMintNonce(address _user) external view override returns (uint256) {
        return accessControlManager.userMintNonce(_user);
    }
    
    /**
    * @dev checks whether this contract has been registered as a system contract (Craft, Salvage, Lootbox)
    * @param _contract contract address to check for role
    */
    function isSystemContract(address _contract) external view override returns(bool) {
        return accessControlManager.isSystemContract(_contract);
    }
    
    /**
    * @dev returns the receiver address and royalty amount for a token sold at a certain sales price
    * @param _tokenId uint256 ID of token to query
    * @param _salePrice price the asset is to be purchased for
    */
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        // Get the Royalties from the collection storage.
        uint24 rate = 0;
        (receiver, rate) = collectionStorage.getRoyalty(_tokenId);
        
        royaltyAmount = _salePrice * rate / 1e6;
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/
    function _supply(uint256 _tokenId) internal view returns(uint256) {
        return collectionStorage.supply(_tokenId);
    }

    function _maxSupply(uint256 _tokenId) internal view returns(uint256) {
        return collectionStorage.maxSupply(_tokenId);
    }

    function _tokenExists(uint256 _tokenId) internal view returns(bool) {
        return collectionStorage.exists(_tokenId);
    }

    function _updateSupply(uint256 _tokenId, uint256 _newSupply) internal {
        return collectionStorage.updateSupply(_tokenId, _newSupply);
    }

    uint256[50] private __gap;
}