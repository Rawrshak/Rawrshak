// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
// import "../libraries/LibAsset.sol";
import "../libraries/LibTags.sol";
// import "../utils/StringEnumerableMaps.sol";
import "../utils/LibConstants.sol";

abstract contract TagsManager is OwnableUpgradeable, ERC165StorageUpgradeable {
    // using StringsUpgradeable for uint256;
    // using StringEnumerableMaps for *;
    using EnumerableSetUpgradeable for *;

    // Todo: Fix this
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('getLatestUriVersion(uint256)')) == 0x0a64da48
     */
    // bytes4 private constant _INTERFACE_ID_TAGS_MANAGER = 0x11111111;

    /***************** Stored Variables *****************/
    mapping(bytes4 => LibTags.TagData) tags;
    
    /*********************** Events *********************/
    event ContractTagsAdded(address indexed addr, string[] tags);
    event ContractTagsRemoved(address indexed addr, string[] tags);
    event AssetTagsAdded(address indexed addr, uint256 indexed id, string[] tags);
    event AssetTagsRemoved(address indexed addr, uint256 indexed id, string[] tags);

    // Note: Currently, We have a set for Contract Tags and Asset Tags. Realistically, we can 
    //       probably combine these and use the hash of the contract address and token id as
    //       the hash id: Set(keccak(address)) and Set(keccak(address,tokenId)). This needs 
    //       investigation, but will probably work. Will leave as a Todo for now.

    /******************** Public API ********************/
    function __TagsManager_init() internal initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        __TagsManager_init_unchained();
    }

    /******************** Public API ********************/
    function __TagsManager_init_unchained() internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_TAGS_MANAGER);
    }

    function addContractTags(address _addr, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.contracts.add(_addr);
        }

        emit ContractTagsAdded(_addr, _tags);
    }

    function removeContractTags(address _addr, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.contracts.remove(_addr);
        }

        emit ContractTagsRemoved(_addr, _tags);
    }

    function addAssetTags(address _addr, uint256 _id, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.assets.add(keccak256(abi.encodePacked(_addr, _id)));
        }

        emit AssetTagsAdded(_addr, _id, _tags);
    }

    function removeAssetTags(address _addr, uint256 _id, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            LibTags.TagData storage tagData = tags[bytes4(keccak256(abi.encodePacked(_tags[i])))];
            tagData.assets.remove(keccak256(abi.encodePacked(_addr, _id)));
        }

        emit AssetTagsRemoved(_addr, _id, _tags);
    }

    function hasContractTag(address _addr, string memory _tag) public view returns (bool) {
        return tags[bytes4(keccak256(abi.encodePacked(_tag)))].contracts.contains(_addr);
    }

    function hasAssetTag(address _addr, uint256 _id, string memory _tag) public view returns (bool) {
        return tags[bytes4(keccak256(abi.encodePacked(_tag)))].assets.contains(keccak256(abi.encodePacked(_addr, _id)));
    }

    /**************** Internal Functions ****************/
    
    uint256[50] private __gap;
}