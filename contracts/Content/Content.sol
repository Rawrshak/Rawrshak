// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "../libraries/LibRoyalties.sol";
import "../utils/LibConstants.sol";
import "./interfaces/IContent.sol";
import "./interfaces/ISystemsRegistry.sol";
import "./interfaces/IContentStorage.sol";

contract Content is IContent, OwnableUpgradeable, ERC1155Upgradeable, ERC165StorageUpgradeable {
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
    IContentStorage contentStorage;
    ISystemsRegistry public systemsRegistry;

    /*********************** Events *********************/

    /******************** Public API ********************/
    function __Content_init(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        address _contentStorage,
        address _systemsRegistry)
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained(_contractUri);
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT);
        name = _name;
        symbol = _symbol;
        
        require(_contentStorage.isContract() && 
                _contentStorage.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE),
                "Invalid Address");
        contentStorage = IContentStorage(_contentStorage);
        // todo: check _systemsRegistry as a contract
        systemsRegistry = ISystemsRegistry(_systemsRegistry);
    }

    function approveAllSystems(bool _approve) external override {
        return systemsRegistry.userApprove(_msgSender(), _approve);
    }

    function tokenUri(uint256 _tokenId) external view override returns (string memory) {
        return contentStorage.uri(_tokenId);
    }

    function tokenDataUri(uint256 _tokenId) external view override returns (string memory) {
        // user cannot access token uri if they do not own it.
        if (balanceOf(_msgSender(), _tokenId) == 0) {
            return "";
        }
        uint256 version = HasTokenUri(address(contentStorage)).getLatestUriVersion(_tokenId);
        return contentStorage.tokenDataUri(_tokenId, version);
    }
    
    function tokenDataUri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        // user cannot access token uri if they do not own it.
        if (balanceOf(_msgSender(), _tokenId) == 0) {
            return "";
        }
        return contentStorage.tokenDataUri(_tokenId, _version);
    }
    
    function getRoyalties(uint256 _tokenId) external view override returns (LibRoyalties.Fees[] memory) {
        return contentStorage.getRoyalties(_tokenId);
    }

    function isSystemOperatorApproved(address _operator) external view override returns (bool) {
        return _isSystemOperatorApproved(_msgSender(), _operator);
    }

    function isOperatorRegistered(address _operator) external view override returns (bool) {
        return systemsRegistry.isOperatorRegistered(_operator);
    }

    function getSupplyInfo(uint256 _tokenId) external view override returns (uint256 supply, uint256 maxSupply) {
        return (_supply(_tokenId), _maxSupply(_tokenId));
    }

    function mintBatch(LibAsset.MintData memory _data) external override {
        // Todo: _isSystemOperatorApproved() must check if the sender is a minter address, a registered system, or owner. If 
        //      these are not true, check the signatures to verify if a minter address signed the message. This doesn't need 
        //      to check if the user allowed the system to mint for it. that doesn't make sense.
        // require(_isSystemOperatorApproved(_data.to, _msgSender()), "Invalid permissions");
        systemsRegistry.verifyMint(_data, _msgSender());
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            require(
                _maxSupply(_data.tokenIds[i]) == 0 ||
                _maxSupply(_data.tokenIds[i]) >= SafeMathUpgradeable.add(_supply(_data.tokenIds[i]), _data.amounts[i]),
                "Max Supply reached"
            );

            _updateSupply(_data.tokenIds[i], SafeMathUpgradeable.add(_supply(_data.tokenIds[i]), _data.amounts[i]));
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
    }

    function burnBatch(LibAsset.BurnData memory _data) external override {
        require(_data.account == _msgSender() || _isSystemOperatorApproved(_data.account, _msgSender()), "Caller is not approved.");

        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            _updateSupply(_data.tokenIds[i], SafeMathUpgradeable.sub(_supply(_data.tokenIds[i]), _data.amounts[i], "amount is greater than supply"));
        }

        _burnBatch(_data.account, _data.tokenIds, _data.amounts);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _isSystemOperatorApproved(address _user, address _operator) internal view returns(bool) {
        return systemsRegistry.isSystemOperatorApproved(_user, _operator);
    }

    function _supply(uint256 _tokenId) internal view returns(uint256) {
        return contentStorage.getSupply(_tokenId);
    }

    function _maxSupply(uint256 _tokenId) internal view returns(uint256) {
        return contentStorage.getMaxSupply(_tokenId);
    }

    function _tokenExists(uint256 _tokenId) internal view returns(bool) {
        return contentStorage.getIds(_tokenId);
    }

    function _updateSupply(uint256 _tokenId, uint256 _newSupply) internal {
        return contentStorage.updateSupply(_tokenId, _newSupply);
    }


    uint256[50] private __gap;
}