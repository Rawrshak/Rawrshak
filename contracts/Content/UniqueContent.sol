// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./Content.sol";
import "../libraries/LibRoyalties.sol";
import "../libraries/LibAsset.sol";
import "./HasContractUri.sol";
import "./HasRoyalties.sol";
import "../utils/LibConstants.sol";
import "./interfaces/IUniqueContent.sol";
import "./interfaces/IHiddenData.sol";

contract UniqueContent is IUniqueContent, HasContractUri, HasRoyalties, OwnableUpgradeable, ERC721Upgradeable, ERC1155HolderUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('setContractUri(string memory)')) == 0x5b54d3f4
     * bytes4(keccak256('uri(uint256)')) == 0x0e89341c
     * bytes4(keccak256('setContractRoyalties(LibRoyalties.Fees[] memory)')) == 0xa2de9fbe
     * bytes4(keccak256('setTokenRoyalties(uint256, LibRoyalties.Fees[] memory)')) == 0x170ea8e3
     * bytes4(keccak256('setSystemApproval(LibAsset.SystemApprovalPair[] memory)')) == 2d24632d
     * bytes4(keccak256('isApprovedForAll(address, address)')) == 0x3a95ab7f
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     */

    /***************** Stored Variables *****************/
    address public override creator;
    address public override contentContract;
    uint256 public override id;
    bool private isMinted = false;

    /******************** Public API ********************/
    function __UniqueContent_init(
        string memory _name,
        string memory _symbol,
        string memory _contractUri,
        LibAsset.UniqueContentData memory _mintData)
        public initializer
    {
        __Ownable_init_unchained();
        __Context_init_unchained();
        __ERC165_init_unchained();
        __ERC721_init_unchained(_name, _symbol);
        __ERC1155Receiver_init_unchained();
        __ERC1155Holder_init_unchained();
        __HasRoyalties_init_unchained(_mintData.contractFees);
        __HasContractUri_init_unchained(_contractUri);
        _registerInterface(LibConstants._INTERFACE_ID_UNIQUE_CONTENT);

        require(_mintData.contentContract.isContract() && 
                _mintData.contentContract.supportsInterface(LibConstants._INTERFACE_ID_CONTENT),
                "Invalid Address");
        creator = _mintData.creator;
        id = _mintData.id;
        contentContract = _mintData.contentContract;

        _setParent(address(this));

        emit UniqueContentCreated(_mintData.creator, _name, _symbol, _mintData);
    }

    function getRoyalties(uint256) external view override returns (LibRoyalties.Fees[] memory) {
        LibRoyalties.Fees[] memory tokenRoyalties = IContent(contentContract).getRoyalties(id);
        LibRoyalties.Fees[] memory royalties = new LibRoyalties.Fees[](tokenRoyalties.length + contractRoyalties.length);
        uint256 index = 0;
        
        // Get Content Creator royalties
        for (uint256 i = 0; i < tokenRoyalties.length; ++i) {
            royalties[index] = tokenRoyalties[i];
            index++;
        }

        // Get Unique Content Creator royalties
        for (uint256 i = 0; i < contractRoyalties.length; ++i) {
            royalties[index] = contractRoyalties[i];
            index++;
        }

        return royalties;
    }

    function ownerOf(uint256) public view override(IERC721Upgradeable, ERC721Upgradeable) returns (address) {
        return super.ownerOf(0);
    }

    function safeTransferFrom(address from, address to, uint256, bytes memory data) public override(IERC721Upgradeable, ERC721Upgradeable) {
        super.safeTransferFrom(from, to, 0, data);
    }

    function safeTransferFrom(address from, address to, uint256) public override(IERC721Upgradeable, ERC721Upgradeable) {
        super.safeTransferFrom(from, to, 0, "");
    }

    function transferFrom(address from, address to, uint256) public override(IERC721Upgradeable, ERC721Upgradeable) {
        super.transferFrom(from, to, 0);
    }

    function approve(address to, uint256) public override(IERC721Upgradeable, ERC721Upgradeable) {
        super.approve(to, 0);
    }

    function getApproved(uint256) public view override(IERC721Upgradeable, ERC721Upgradeable) returns (address) {
        return super.getApproved(0);
    }

    function tokenURI(uint256) public view override returns (string memory) {
        return Content(contentContract).uri(id);
    }

    function hiddenUri(uint256) external view override returns (string memory) {
        // only owner of the token can open the token's data uri
        if (ownerOf(0) == _msgSender() || !IERC165Upgradeable(contentContract).supportsInterface(LibConstants._INTERFACE_ID_CONTENT_WITH_HIDDEN_DATA)) {
            return "";
        }
        return IHiddenData(contentContract).hiddenUri(id);
    }

    function mint(address to) external override onlyOwner {
        require(contentContract != address(0), "Invalid Content Contract address");
        require(Content(contentContract).balanceOf(address(this), id) == 1, "This contract doesn't own the token.");
        require(isMinted == false, "Unique Content is already minted.");
        
        _safeMint(to, 0, "");
    }

    function burn(address to) external override {
        // only the creator can burn the unique asset. They must, however, own the token first.
        require(_msgSender() == creator, "Invalid burn permissions.");
        require(contentContract != address(0), "Invalid Content Contract address");
        require(ownerOf(0) == _msgSender(), "Burner doesn't own this asset");
        require(isMinted == true, "Unique Content has already been burned");
        
        _burn(0);
        Content(contentContract).safeTransferFrom(_msgSender(), to, id, 1, "");
    }
    
    function onERC1155Received(
        address,
        address _from,
        uint256 _id,
        uint256 _value,
        bytes memory
    ) public virtual override returns (bytes4) {
        // The Unique Content can only receive the asset that was assigned to this contract
        // and can only receive 1 of that asset from the creator.
        require (creator == _from && id == _id && _value == 1, "Cannot receive this item.");        
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address _from,
        uint256[] memory _ids,
        uint256[] memory _amounts,
        bytes memory
    ) public virtual override returns (bytes4) {
        require(
            creator == _from &&
            _ids.length == 1 &&
            _amounts.length == 1 &&
            _amounts[0] == 1 &&
            _ids[0] == id,
            "Cannot receive this item."
        );
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable, ERC1155ReceiverUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    /**************** Internal Functions ****************/

}