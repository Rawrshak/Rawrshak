// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
// import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";
import "../libraries/LibAsset.sol";
import "./ContentSubsystemBase.sol";
import "../utils/StringEnumerableMaps.sol";

abstract contract HasTags is ContentSubsystemBase {
    using StringsUpgradeable for uint256;
    using StringEnumerableMaps for *;

    // Todo: Fix this
    /******************** Constants ********************/
    /*
     * bytes4(keccak256('getLatestUriVersion(uint256)')) == 0x0a64da48
     */
    bytes4 private constant _INTERFACE_ID_TAGS = 0x11111111;

    /***************** Stored Variables *****************/
    StringEnumerableMaps.Bytes32ToStringMap private contractTags;
    mapping(uint256 => StringEnumerableMaps.Bytes32ToStringMap) private assetTags;
    
    /*********************** Events *********************/
    event ContractTagsAdded(address indexed parent, string[] tags);
    event ContractTagsRemoved(address indexed parent, string[] tags);
    event AssetTagsAdded(address indexed parent, uint256 indexed id, string[] tags);
    event AssetTagsRemoved(address indexed parent, uint256 indexed id, string[] tags);

    /******************** Public API ********************/
    function __HasTags_init_unchained() internal initializer {
        _registerInterface(_INTERFACE_ID_TAGS);
    }

    function addContractTags(string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            contractTags.set(keccak256(abi.encodePacked(_tags[i])), _tags[i]);
        }

        emit ContractTagsAdded(_parent(), _tags);
    }

    function removeContractTags(string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            contractTags.remove(keccak256(abi.encodePacked(_tags[i])));
        }

        emit ContractTagsRemoved(_parent(), _tags);
    }

    function addAssetTags(uint256 _id, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            assetTags[_id].set(keccak256(abi.encodePacked(_tags[i])), _tags[i]);
        }

        emit AssetTagsAdded(_parent(), _id, _tags);
    }

    function removeAssetTags(uint256 _id, string[] memory _tags) external {
        for (uint256 i = 0; i < _tags.length; ++i) {
            assetTags[_id].remove(keccak256(abi.encodePacked(_tags[i])));
        }

        emit AssetTagsRemoved(_parent(), _id, _tags);
    }

    function hasContractTag(string memory _tag) public view returns (bool) {
        return contractTags.contains(keccak256(abi.encodePacked(_tag)));
    }

    function hasAssetTag(uint256 _tokenId, string memory _tag) public view returns (bool) {
        return assetTags[_tokenId].contains(keccak256(abi.encodePacked(_tag)));
    }

    /**************** Internal Functions ****************/
    
    uint256[50] private __gap;
}