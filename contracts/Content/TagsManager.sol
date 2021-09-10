// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import "../libraries/LibTags.sol";
import "../utils/LibConstants.sol";
import "../registry/ContractRegistry.sol";
import "./interfaces/ITagsManager.sol";

contract TagsManager is ITagsManager, OwnableUpgradeable, ERC165StorageUpgradeable {
    using AddressUpgradeable for address;
    using EnumerableSetUpgradeable for *;

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('owner()')) == 0x8da5cb5b
     * bytes4(keccak256('renounceOwnership()')) == 0x715018a6
     * bytes4(keccak256('transferOwnership()')) == 0x880ad0af
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     * bytes4(keccak256('hasContractTag(address,string memory)')) == 0xcf550f18
     * bytes4(keccak256('hasAssetTag(address,uint256,string memory)')) == 0x538380ea
     * bytes4(keccak256('addContractTags(address,string[] memory)')) == 0x28f89f01
     * bytes4(keccak256('removeContractTags(address,string[] memory)')) == 0xbf4e0100
     * bytes4(keccak256('addAssetTags(address,uint256,string[] memory)')) == 0x8c736996
     * bytes4(keccak256('removeAssetTags(address,uint256,string[] memory)')) == 0x427ece76
     */
    // bytes4 private constant _INTERFACE_ID_TAGS_MANAGER = 0xB06D7CE6;

    /***************** Stored Variables *****************/
    mapping(bytes4 => LibTags.TagData) tags;
    ContractRegistry contractRegistry;
    
    /*********************** Events *********************/
    event ContractTagsAdded(address indexed addr, string[] tags);
    event ContractTagsRemoved(address indexed addr, string[] tags);
    event AssetTagsAdded(address indexed addr, uint256 indexed id, string[] tags);
    event AssetTagsRemoved(address indexed addr, uint256 indexed id, string[] tags);

    /********************* Modifiers ********************/
    modifier verifyOwner() {
        require(IERC165Upgradeable(_msgSender()).supportsInterface(LibConstants._INTERFACE_ID_CONTENT_MANAGER), "Invalid interface");
        require(contractRegistry.isRegistered(_msgSender()), "Unregistered Contract.");
        _;
    }

    // Note: Currently, We have a set for Contract Tags and Asset Tags. Realistically, we can 
    //       probably combine these and use the hash of the contract address and token id as
    //       the hash id: Set(keccak(address)) and Set(keccak(address,tokenId)). This needs 
    //       investigation, but will probably work. Will leave as a Todo for now.

    /******************** Public API ********************/
    function __TagsManager_init(address _contractRegistry) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __TagsManager_init_unchained(_contractRegistry);
    }

    function __TagsManager_init_unchained(address _contractRegistry) internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_TAGS_MANAGER);
        contractRegistry = ContractRegistry(_contractRegistry);
    }

    function addContractTags(address _addr, string[] memory _tags) external override verifyOwner {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.contracts.add(_addr);
        }

        emit ContractTagsAdded(_addr, _tags);
    }

    function removeContractTags(address _addr, string[] memory _tags) external override verifyOwner {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.contracts.remove(_addr);
        }

        emit ContractTagsRemoved(_addr, _tags);
    }

    function addAssetTags(address _addr, uint256 _id, string[] memory _tags) external override verifyOwner {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.assets.add(keccak256(abi.encodePacked(_addr, _id)));
        }

        emit AssetTagsAdded(_addr, _id, _tags);
    }

    function removeAssetTags(address _addr, uint256 _id, string[] memory _tags) external override verifyOwner {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.assets.remove(keccak256(abi.encodePacked(_addr, _id)));
        }

        emit AssetTagsRemoved(_addr, _id, _tags);
    }

    function hasContractTag(address _addr, string memory _tag) external override view returns (bool) {
        return tags[bytes4(keccak256(abi.encodePacked(_tag)))].contracts.contains(_addr);
    }

    function hasAssetTag(address _addr, uint256 _id, string memory _tag) external override view returns (bool) {
        return tags[bytes4(keccak256(abi.encodePacked(_tag)))].assets.contains(keccak256(abi.encodePacked(_addr, _id)));
    }

    /**************** Internal Functions ****************/
    
    uint256[50] private __gap;
}