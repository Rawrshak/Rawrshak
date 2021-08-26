// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

interface ITagsManager {
    /******** View Functions ********/
    function hasContractTag(address _addr, string memory _tag) external view returns (bool);

    function hasAssetTag(address _addr, uint256 _id, string memory _tag) external view returns (bool);

    /******** Mutative Functions ********/
    function addContractTags(address _addr, string[] memory _tags) external;

    function removeContractTags(address _addr, string[] memory _tags) external;

    function addAssetTags(address _addr, uint256 _id, string[] memory _tags) external;

    function removeAssetTags(address _addr, uint256 _id, string[] memory _tags) external;
}