// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "./LibAsset.sol";
import "../utils/Constants.sol";
import "./ContentStorage.sol";
import "./Content.sol";

contract ContentManager is OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;
    
    /******************** Constants ********************/

    /***************** Stored Variables *****************/
    address public content;
    address private contentStorage;

    /*********************** Events *********************/
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
        external initializer
    {
        __Ownable_init_unchained();
        _registerInterface(Constants._INTERFACE_ID_CONTENT_MANAGER);
    
        require(_content.isContract() && 
                _content.supportsInterface(Constants._INTERFACE_ID_CONTENT),
                "Invalid Address");
        require(_contentStorage.isContract() && 
                _contentStorage.supportsInterface(Constants._INTERFACE_ID_CONTENT_STORAGE),
                "Invalid Address");

        content = _content;
        contentStorage = _contentStorage;
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

    function updateTokenUriBatch(LibAsset.AssetUri[] memory _assets) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).updateTokenUriBatch(_assets);
    }

    function setContractRoyalties(LibRoyalties.Fees[] memory _fee) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).setContractRoyalties(_fee);
    }
    
    function updateTokenRoyaltiesBatch(LibAsset.AssetRoyalties[] memory _assets) external onlyOwner addressExists(contentStorage) {
        ContentStorage(contentStorage).updateTokenRoyaltiesBatch(_assets);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165StorageUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
    
    /**************** Internal Functions ****************/
}
