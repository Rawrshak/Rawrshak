// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./interfaces/IHiddenData.sol";
import "./Content.sol";

/**
 * @dev ERC721 token with storage based token URI management.
 */
abstract contract ContentWithHiddenData is IHiddenData, Content {
    function __ContentWithHiddenData_init(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        IContentStorage _dataStorage,
        ISystemsRegistry _systemsRegistry)
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC1155_init_unchained(_contractUri);
        __Content_init_unchained(_name, _symbol, _dataStorage, _systemsRegistry);
        __ContentWithHiddenData_init_unchained();
    }

    function __ContentWithHiddenData_init_unchained() internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_WITH_HIDDEN_DATA);
    }
    
    function hiddenUri(uint256 _tokenId) external view override returns (string memory) {
        // Hidden Token Uri can only be accessed if the user owns the token or the caller is a registered system address
        // which is used for token management and development
        uint256 version = HasTokenUri(address(dataStorage)).getLatestUriVersion(_tokenId, false);
        return this.hiddenUri(_tokenId, version);
    }
    
    function hiddenUri(uint256 _tokenId, uint256 _version) external view override returns (string memory) {
        // Hidden Token Uri can only be accessed if the user owns the token or the caller is a registered system address
        // which is used for token management and development
        if (balanceOf(_msgSender(), _tokenId) == 0 && !systemsRegistry.isOperatorRegistered(_msgSender())) {
            return "";
        }
        return dataStorage.hiddenUri(_tokenId, _version);
    }

    uint256[50] private __gap;
}
