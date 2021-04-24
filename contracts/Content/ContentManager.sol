// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./UniqueContent.sol";
import "./interfaces/IContent.sol";
import "./interfaces/IContentStorage.sol";
import "./interfaces/IContentManager.sol";
import "./interfaces/IUniqueContent.sol";

contract ContentManager is IContentManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('addAssetBatch(LibAsset.CreateData[] memory)')) == 0xFFFFFFFF
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_MANAGER = 0x00000003;

    /***************** Stored Variables *****************/
    IContent public content;
    IContentStorage private contentStorage;

    /*********************** Events *********************/
    event ContentContractCreated(address content, address contentStorage);

    /********************* Modifiers ********************/
    modifier addressExists(address addr) {
        require(addr != address(0), "Invalid permissions.");
        _;
    }

    /******************** Public API ********************/
    
    function __ContentManager_init(
        address _content,
        address _contentStorage
    )
        public initializer
    {
        __Ownable_init_unchained();
        __ERC165Storage_init_unchained();
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER);
    
        require(_content != address(0) && _content.isContract() && 
                _content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT),
                "Invalid Address");
        require(_contentStorage != address(0) && _contentStorage.isContract() && 
                _contentStorage.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE),
                "Invalid Address");

        content = IContent(_content);
        contentStorage = IContentStorage(_contentStorage);
        emit ContentContractCreated(_content, _contentStorage);
    }
    
    function addAssetBatch(
        LibAsset.CreateData[] memory _assets
    ) external override onlyOwner {
        content.addAssetBatch(_assets);
        contentStorage.addAssetBatch(_assets);
    }

    function setContractUri(string memory _contractUri) public override onlyOwner {
        content.setContractUri(_contractUri);
    }
    
    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) public override onlyOwner {
        contentStorage.setSystemApproval(_operators);
    }
    
    function setTokenUriPrefix(string memory _tokenUriPrefix) external override onlyOwner {
        contentStorage.setTokenUriPrefix(_tokenUriPrefix);
    }

    function setTokenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setTokenUriBatch(_assets);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external override onlyOwner {
        contentStorage.setContractRoyalties(_fee);
    }
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external override onlyOwner {
        contentStorage.setTokenRoyaltiesBatch(_assets);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    function mintBatch(LibAsset.MintData memory _data) external override onlyOwner {
        content.mintBatch(_data);
    }
    
    function mintUnique(
        LibAsset.MintData memory _data,
        address _uniqueContentContract,
        address to
    ) external override onlyOwner {
        require(_uniqueContentContract != address(0) && _uniqueContentContract.isContract() && 
                _uniqueContentContract.supportsInterface(LibConstants._INTERFACE_ID_UNIQUE_CONTENT),
                "Invalid Address");
        require(_data.tokenIds.length == 1, "Only mint 1 asset per Unique Content Contract.");
        require(_data.to == _uniqueContentContract, "Mint asset to the Unique Content Contract");
        
        content.mintBatch(_data);
        IUniqueContent(_uniqueContentContract).mint(to);
    }
    
    uint256[50] private __gap;
}
