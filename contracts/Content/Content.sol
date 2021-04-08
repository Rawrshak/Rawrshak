// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./SystemsApproval.sol";
import "./LibRoyalties.sol";


contract Content is Ownable, HasContractURI, HasTokenURI, HasRoyalties, SystemsApproval, ERC1155Burnable {
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('setContractURI(string memory)')) == 0x5b54d3f4
     * bytes4(keccak256('uri(uint256)')) == 0x0e89341c
     * bytes4(keccak256('setContractRoyalties(LibRoyalties.Fees[] memory)')) == 0xa2de9fbe
     * bytes4(keccak256('setTokenRoyalties(uint256, LibRoyalties.Fees[] memory)')) == 0x170ea8e3
     * bytes4(keccak256('setSystemApproval(address, bool)')) == 0x8f10d204
     * bytes4(keccak256('isApprovedForAll(address, address)')) == 0x3a95ab7f
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     */
    bytes4 private constant _INTERFACE_ID_CONTENT = 0x00000001;

    /***************** Stored Variables *****************/
    string public name;
    string public symbol;

    /*********************** Events *********************/
    /********************* Modifiers ********************/
    /******************** Public API ********************/
    constructor(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        string memory _tokenUriPrefix,
        LibRoyalties.Fees[] memory _contractFees)
        HasContractURI(_contractUri)
        HasTokenURI(_tokenUriPrefix)
        HasRoyalties(_contractFees)
        ERC1155("")
    {
        name = _name;
        symbol = _symbol;

        // register the supported interface to conform to the ERC1155
        _registerInterface(_INTERFACE_ID_CONTENT);
    }

    function setContractURI(string memory _contractURI) public onlyOwner {
        _setContractURI(_contractURI);
    }
    
    function uri(uint256 _contractURI) public view override returns (string memory) {
        return _tokenURI(_contractURI);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) public onlyOwner {
        _setContractRoyalties(_fee);
    }

    function setTokenRoyalties(uint256 _tokenId, LibRoyalties.Fees[] memory _fees) public onlyOwner {
        _setTokenRoyalties(_tokenId, _fees);
    }

    function setSystemApproval(address _operator, bool _hasApproval) public onlyOwner {
        _setSystemApproval(_operator, _hasApproval);
    }

    function isApprovedForAll(address _owner, address _operator) public override(SystemsApproval, ERC1155) view returns (bool) {
        return SystemsApproval.isApprovedForAll(_owner, _operator);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(SystemsApproval, ERC1155, ERC165Storage) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    // todo: use CreateAsset() to add a tokenURI
    // todo: add Mint
}