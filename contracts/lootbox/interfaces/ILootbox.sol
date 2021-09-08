// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../libraries/LibLootbox.sol";

interface ILootbox {
    /******** View Functions ********/
    function blueprint(uint256 _id) external view returns(LibLootbox.Blueprint memory _blueprint);

    function exists(uint256 _id) external view returns(bool);

    function cost(uint256 _id) external view returns(uint256);

    /******** Mutative Functions ********/
    function setBlueprintBatch(LibLootbox.Blueprint[] memory _asset) external;

    function setBlueprintEnabled(uint256 _id, bool _enabled) external;

    function setBlueprintCost(uint256 _id, uint256 _cost) external;

    function mint(uint256 _id, uint256 _amount) external;

    function setClassForTokenId(uint256 _tokenId, uint256 _class) external;

    function setTokenIdsForClass(uint256 _class, uint256[] memory _tokenIds) external;

    function resetClass(uint256 _class) external;

    function open(uint256 _optionId, address _toAddress, uint256 _amount) external;
    
    /*********************** Events *********************/
    event BlueprintUpdated(address indexed operator, LibLootbox.Blueprint[] blueprints);
    event BlueprintEnabled(address indexed operator, uint256 indexed id, bool enabled);
    event BlueprintCostUpdated(address indexed operator, uint256 indexed id, uint256 cost);
    event AssetsCrafted(address indexed user, uint256 indexed id, uint256 amountSucceeded);
    event LootboxOpened(address indexed user, uint256 indexed id);
}