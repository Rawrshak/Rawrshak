// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./HasRoyalties.sol";
import "./HasTokenUri.sol";
import "./LibAsset.sol";

contract ContentStorage is OwnableUpgradeable, HasRoyalties, HasTokenURI {
    using AddressUpgradeable for *;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('contractRoyalties()')) == 0xFFFFFFFF
     */
    bytes4 private constant _INTERFACE_ID_ROYALTIES = 0xFFFFFFFF;

    /***************** Stored Variables *****************/
    address private parent;
    mapping(uint256 => bool) private ids;

    /*********************** Events *********************/
    event AssetsAdded(LibAsset.CreateData[] assets);
    event TokenUriUpdated(LibAsset.AssetUri[] assets);
    event TokenRoyaltiesUpdated(LibAsset.AssetRoyalties[] assets);

    /******************** Public API ********************/
    function __ContentStorage_init_unchained(
        string memory _tokenURIPrefix,
        LibRoyalties.Fees[] memory _contractFees
    ) internal initializer {
        __Ownable_init_unchained();
        __ERC165Storage_init_unchained();
        __HasTokenURI_init_unchained(_tokenURIPrefix);
        __HasRoyalties_init_unchained(_contractFees);
    }

    function tokenURI(uint256 _tokenId, uint256 _version) public view returns (string memory) {
        return _tokenURI(_tokenId, _version);
    }

    function getRoyalties(uint256 _tokenId) public view returns (LibRoyalties.Fees[] memory) {
        return _getRoyalties(_tokenId);
    }

    function setParent(address _parent) external onlyOwner {
        require(_parent.isContract(), "Input is not a contract address.");
        parent = _parent;
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external onlyOwner {
        _setContractRoyalties(_fee);
    }

    function addAssetBatch(LibAsset.CreateData[] memory _assets) external onlyOwner {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(!ids[_assets[i].tokenId], "Token Id already exists.");
            _setTokenUri(_assets[i].tokenId, _assets[i].dataUri);
            
            // if this specific token has a different royalty fees than the contract
            if (_assets[i].fees.length != 0) {
                _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
            }
        }

        emit AssetsAdded(_assets);
    }

    function updateTokenUriBatch(LibAsset.AssetUri[] memory _assets) public onlyOwner {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setTokenUri(_assets[i].tokenId, _assets[i].uri);
        }

        emit TokenUriUpdated(_assets);
    }

    function updateTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external onlyOwner {
        for (uint256 i = 0; i < _assets.length; ++i) {
            require(ids[_assets[i].tokenId], "Invalid Token Id");
            _setTokenRoyalties(_assets[i].tokenId, _assets[i].fees);
        }
        
        emit TokenRoyaltiesUpdated(_assets);
    }
    
    uint256[50] private __gap;
}