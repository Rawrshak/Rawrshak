// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/IERC721MetadataUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import "../../libraries/LibRoyalty.sol";
import "../../libraries/LibAsset.sol";

contract TestErc721Contract is IERC2981Upgradeable, ERC721Upgradeable, ERC165StorageUpgradeable {
    /***************** Stored Variables *****************/

    uint256 private assetCounter;
    mapping(uint256 => LibRoyalty.Fee) internal tokenRoyalty;
    mapping(uint256 => string) internal uris;

    /******************** Public API ********************/
    function initialize(
        string memory _name,
        string memory _symbol)
        public initializer
    {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC721_init_unchained(_name, _symbol);
        __TestErc721Contract_init_unchained();
    }

    function __TestErc721Contract_init_unchained() internal onlyInitializing
    {
        _registerInterface(type(IERC2981Upgradeable).interfaceId);
        _registerInterface(type(IERC721Upgradeable).interfaceId);

        assetCounter = 0;
    }

    function mint(address _to, address _receiver, uint24 _rate, string memory _uri) external {
        require(_rate <= 1e6, "Invalid Fee Rate");
        tokenRoyalty[assetCounter].receiver = _receiver;
        tokenRoyalty[assetCounter].rate = _rate;
        uris[assetCounter] = _uri;

        _safeMint(_to, assetCounter++, "");
    }

    function burn(uint256 _tokenId) external {
        require(_exists(_tokenId), "Error: non-existent token");
        _burn(_tokenId);
    }

    function setTokenRoyalty(uint256 _tokenId, address _receiver, uint24 _rate) public {
        require(_exists(_tokenId), "Error: non-existent token");
        require(_rate <= 1e6, "Invalid Fee Rate");
        tokenRoyalty[_tokenId].receiver = _receiver;
        tokenRoyalty[_tokenId].rate = _rate;
    }

    function setTokenURI(uint256 _tokenId, string memory _uri) public {
        require(_exists(_tokenId), "Error: non-existent token");
        uris[_tokenId] = _uri;
    }

    function tokenURI(uint256 _tokenId) public view override returns(string memory){
        return uris[_tokenId];
    } 
    
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice) external view override returns (address receiver, uint256 royaltyAmount) {
        receiver = tokenRoyalty[_tokenId].receiver;
        royaltyAmount = _salePrice * (tokenRoyalty[_tokenId].rate) / 1e6;
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

}