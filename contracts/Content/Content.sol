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
    using SafeMathUpgradeable for uint256;
    
    /******************** Constants ********************/
    /*
    // Todo: Fix this
     * ERC1155 interface == 0xd9b67a26
     * bytes4(keccak256('name()')) == 0x06fdde03
     * bytes4(keccak256('symbol()')) == 0x95d89b41
     * bytes4(keccak256('systemsRegistry()')) == 0x2795ea5a
     * bytes4(keccak256('supply(uint256)')) == 0x35403023
     * bytes4(keccak256('maxSupply(uint256)')) == 0x869f7594
     * bytes4(keccak256('tokenUri(uint256)')) == 0x1675f455
     * bytes4(keccak256('approveAllSystems(bool)')) == 0x04a90ad5
     * bytes4(keccak256('mintBatch(LibAsset.MintData memory)')) == 0x9791d37a
     * bytes4(keccak256('burnBatch(LibAsset.BurnData memory)')) == 0xa0a862d5
     *      => 0x94b3e03b
     */

    /***************** Stored Variables *****************/
    string public override name;
    string public override symbol;
    IContentStorage dataStorage;
    ISystemsRegistry public override systemsRegistry;

    /******************** Public API ********************/
    function __Content_init(
        string memory _name,
        string memory _symbol,
        IContentStorage _dataStorage,
        ISystemsRegistry _systemsRegistry)
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained("");
        __Content_init_unchained(_name, _symbol, _dataStorage, _systemsRegistry);
    }

    function __Content_init_unchained(
        string memory _name,
        string memory _symbol,
        IContentStorage _dataStorage,
        ISystemsRegistry _systemsRegistry)
        internal initializer
    {
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT);
        name = _name;
        symbol = _symbol;

        dataStorage = _dataStorage;
        systemsRegistry = _systemsRegistry;
    }

    // SYSTEMS APPROVAL
    function approveAllSystems(bool _approve) external override {
        return systemsRegistry.userApprove(_msgSender(), _approve);
    }

    // CONTRACT URI
    function contractUri() external view override returns (string memory) {
        return dataStorage.contractUri();
    }

    // TOKEN URIS
    function uri(uint256 _tokenId) public view override returns (string memory) {
        uint256 version = HasTokenUri(address(dataStorage)).getLatestUriVersion(_tokenId, true);
        return this.uri(_tokenId, version);
    }

    function uri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        return dataStorage.uri(_tokenId, _version);
    }
    
    // Royalties
    function getRoyalties(uint256 _tokenId) external view override returns (LibRoyalties.Fees[] memory) {
        return dataStorage.getRoyalties(_tokenId);
    }
    
    function supply(uint256 _tokenId) external view override returns (uint256) {
        return _supply(_tokenId);
    }
    
    function maxSupply(uint256 _tokenId) external view override returns (uint256) {
        return _maxSupply(_tokenId);
    }

    // Asset Minting
    function mintBatch(LibAsset.MintData memory _data) external override {
        systemsRegistry.verifyMint(_data, _msgSender());
        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            require(
                _maxSupply(_data.tokenIds[i]) == 0 ||
                _maxSupply(_data.tokenIds[i]) >= _supply(_data.tokenIds[i]).add(_data.amounts[i]),
                "Max Supply reached"
            );

            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]).add(_data.amounts[i]));
        }
        _mintBatch(_data.to, _data.tokenIds, _data.amounts, "");
        emit Mint(_msgSender(), _data);
    }

    // Asset Burning
    function burnBatch(LibAsset.BurnData memory _data) external override {
        require(_data.account == _msgSender() || systemsRegistry.isOperatorApproved(_data.account, _msgSender()), "Caller is not approved.");

        for (uint256 i = 0; i < _data.tokenIds.length; ++i) {
            require(_tokenExists(_data.tokenIds[i]), "token id missing");
            _updateSupply(_data.tokenIds[i], _supply(_data.tokenIds[i]).sub(_data.amounts[i], "amount is greater than supply"));
        }

        _burnBatch(_data.account, _data.tokenIds, _data.amounts);
        emit Burn(_msgSender(), _data);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/
    function _supply(uint256 _tokenId) internal view returns(uint256) {
        return dataStorage.supply(_tokenId);
    }

    function _maxSupply(uint256 _tokenId) internal view returns(uint256) {
        return dataStorage.maxSupply(_tokenId);
    }

    function _tokenExists(uint256 _tokenId) internal view returns(bool) {
        return dataStorage.ids(_tokenId);
    }

    function _updateSupply(uint256 _tokenId, uint256 _newSupply) internal {
        return dataStorage.updateSupply(_tokenId, _newSupply);
    }

    uint256[50] private __gap;
}