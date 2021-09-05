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
import "./interfaces/IAccessControlManager.sol";
import "./interfaces/IUniqueContent.sol";
import "./interfaces/ITagsManager.sol";

contract ContentManager is IContentManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
    // Todo: Fix this
     * bytes4(keccak256('addAssetBatch(LibAsset.CreateData[] memory)')) == 0xFFFFFFFF
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_MANAGER = 0x00000003;

    /***************** Stored Variables *****************/
    IContent public override content;
    IContentStorage public override contentStorage;
    IAccessControlManager public override accessControlManager;
    ITagsManager private tagsManager;

    /******************** Public API ********************/
    
    function __ContentManager_init(
        address _content,
        address _contentStorage,
        address _accessControlManager,
        address _tagsManager
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
        require(_tagsManager != address(0) && _tagsManager.isContract(),"Invalid Address");

        content = IContent(_content);
        contentStorage = IContentStorage(_contentStorage);
        accessControlManager = IAccessControlManager(_accessControlManager);
        tagsManager = ITagsManager(_tagsManager);

        // emit ContentManagerCreated(_msgSender(), _content, _contentStorage, _accessControlManager);
    }
    
    function addAssetBatch(
        LibAsset.CreateData[] memory _assets
    ) external override onlyOwner {
        contentStorage.addAssetBatch(_assets);
    }
    
    function registerOperators(LibAsset.SystemApprovalPair[] memory _operators) public override onlyOwner {
        for (uint256 i = 0; i < _operators.length; ++i) {
            if (_operators[i].approved) {
                IAccessControlUpgradeable(address(accessControlManager)).grantRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            } else {
                IAccessControlUpgradeable(address(accessControlManager)).revokeRole(accessControlManager.MINTER_ROLE(), _operators[i].operator);
            }
        }
    }

    function setHiddenUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setHiddenUriBatch(_assets);
    }
    
    function setPublicUriBatch(LibAsset.AssetUri[] memory _assets) external override onlyOwner {
        contentStorage.setPublicUriBatch(_assets);
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

    function addContractTags(string[] memory _tags) external override onlyOwner {
        tagsManager.addContractTags(address(content), _tags);
    }

    function removeContractTags(string[] memory _tags) external override onlyOwner {
        tagsManager.removeContractTags(address(content), _tags);
    }

    function addAssetTags(uint256 _id, string[] memory _tags) external override onlyOwner {
        require(contentStorage.ids(_id), "token id doesn't exist.");
        tagsManager.addAssetTags(address(content), _id, _tags);
    }
    
    function removeAssetTags(uint256 _id, string[] memory _tags) external override onlyOwner {
        require(contentStorage.ids(_id), "token id doesn't exist.");
        tagsManager.removeAssetTags(address(content), _id, _tags);
    }
    
    uint256[50] private __gap;
}
