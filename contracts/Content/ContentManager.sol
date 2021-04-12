// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./LibAsset.sol";
import "./ContentStorage.sol";
import "./Content.sol";

contract ContentManager is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/
    /*
     * Todo: this
     * bytes4(keccak256('addAssetBatch(LibAsset.CreateData[] memory)')) == 0xFFFFFFFF
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_MANAGER = 0x00000003;

    /***************** Stored Variables *****************/
    address public content;
    address private contentStorage;

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
    
        require(_content.isContract() && 
                _content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT),
                "Invalid Address");
        require(_contentStorage.isContract() && 
                _contentStorage.supportsInterface(LibConstants._INTERFACE_ID_CONTENT_STORAGE),
                "Invalid Address");

        content = _content;
        contentStorage = _contentStorage;
        emit ContentContractCreated(content, contentStorage);
    }
    
    function addAssetBatch(LibAsset.CreateData[] memory _assets) external onlyOwner addressExists(content) addressExists(contentStorage) {
        Content(content).addAssetBatch(_assets);
        ContentStorage(contentStorage).addAssetBatch(_assets);
    }

    function setContractUri(string memory _contractUri) public onlyOwner addressExists(content) {
        Content(content).setContractUri(_contractUri);
    }
    
    function setSystemApproval(LibAsset.SystemApprovalPair[] memory _operators) public onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setSystemApproval(_operators);
    }
    
    function setTokenUriPrefix(string memory _tokenUriPrefix) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setTokenUriPrefix(_tokenUriPrefix);
    }

    function setTokenUriBatch(LibAsset.AssetUri[] memory _assets) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setTokenUriBatch(_assets);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setContractRoyalties(_fee);
    }
    
    function setTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setTokenRoyaltiesBatch(_assets);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    uint256[50] private __gap;
}
