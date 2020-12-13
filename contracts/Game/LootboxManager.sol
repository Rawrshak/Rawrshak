// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "./Lootbox.sol";
import "../factory/LootboxFactory.sol";
import "../interfaces/ILootbox.sol";
import "../interfaces/ILootboxManager.sol";
import "../interfaces/IGlobalItemRegistry.sol";

contract LootboxManager is AccessControl, ILootboxManager, ERC165 {
    using ERC165Checker for *;

    /******** Constant ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes4 private constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A; // Todo:
    bytes4 private constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;
    bytes4 private constant _INTERFACE_ID_ILOOTBOX = 0x00000009; // Todo:
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    
    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    address[] lootboxAddresses;

    /******** Events ********/
    event AddedInputItem(uint256);
    event AddedInputItemBatch(uint256[]);
    event AddedReward(uint256);
    event AddedRewardBatch(uint256[]);
    event LootboxContractCreated(uint256, address);
    
    /******** Modifiers ********/
    modifier checkPermissions(bytes32 _role) {
        require(hasRole(_role, msg.sender), "Caller missing permissions");
        _;
    }

    modifier checkItemExists(uint256 _uuid) {
        require(globalItemRegistry().contains(_uuid), "Item does not exist.");
        _;
    }

    modifier checkLootboxExists(uint256 _lootboxId) {
        require(_lootboxId < lootboxAddresses.length, "Lootbox does not exist.");
        _;
    }
    
    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MANAGER_ROLE, msg.sender);
        _registerInterface(_INTERFACE_ID_ILOOTBOXMANAGER);
    }

    function setGlobalItemRegistryAddr(address _addr)
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        require(lootboxAddresses.length != 0, "Crafting Contract not created yet.");
        globalItemRegistryAddr = _addr;

        for (uint256 i = 0; i < lootboxAddresses.length; ++i) {
            lootbox(i).setGlobalItemRegistryAddr(_addr);
        }
    }

    function generateLootboxContract(
        address _lootboxFactoryAddress,
        string calldata _url
    )
        external
        override
        checkPermissions(MANAGER_ROLE)
        {
        require(
            ERC165Checker.supportsInterface(_lootboxFactoryAddress, _INTERFACE_ID_ILOOTBOXFACTORY),
            "Caller does not support Interface."
        );

        Lootbox lootbox = LootboxFactory(_lootboxFactoryAddress).createLootboxContract(_url);
        lootbox.setLootboxManager(address(this));
        uint256 lootboxId = lootboxAddresses.length;
        lootboxAddresses.push(address(lootbox));
        
        emit LootboxContractCreated(lootboxId, address(lootbox));
    }

    function getLootboxAddress(uint256 _lootboxId) external view override checkLootboxExists(_lootboxId) returns(address) {
        return lootboxAddresses[_lootboxId];
    }

    function registerInputItem(uint256 _lootboxId, uint256 _uuid, uint256 _amount, uint256 _multiplier)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
        checkItemExists(_uuid)
    {
        lootbox(_lootboxId).registerInputItem(_uuid, _amount, _multiplier);

        emit AddedInputItem(_uuid);
    }

    function registerInputItemBatch(
        uint256 _lootboxId,
        uint256[] calldata _uuids,
        uint256[] calldata _amounts,
        uint256[] calldata _multipliers
    ) 
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
    {
        require(_uuids.length == _amounts.length && _uuids.length == _multipliers.length, "Array length mismatch");

        IGlobalItemRegistry registry = globalItemRegistry();
        for (uint256 i = 0; i < _uuids.length; ++i) {
            require(registry.contains(_uuids[i]), "Item does not exist.");
        }

        lootbox(_lootboxId).registerInputItemBatch(_uuids, _amounts, _multipliers);

        emit AddedInputItemBatch(_uuids);
    }

    function registerReward(uint256 _lootboxId, uint256 _uuid, Rarity _rarity, uint256 _amount)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
        checkItemExists(_uuid)
    {
        lootbox(_lootboxId).registerReward(_uuid, _rarity, _amount);

        emit AddedReward(_uuid);
    }

    function registerRewardBatch(
        uint256 _lootboxId,
        uint256[] calldata _uuids,
        Rarity[] calldata _rarities,
        uint256[] calldata _amounts
    ) 
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
    {
        require(_uuids.length == _rarities.length && _uuids.length == _amounts.length, "Input array length mismatch");
        
        IGlobalItemRegistry registry = globalItemRegistry();

        for (uint256 i = 0; i < _uuids.length; ++i) {
            require(registry.contains(_uuids[i]), "Item does not exist.");
        }

        lootbox(_lootboxId).registerRewardBatch(_uuids, _rarities, _amounts);

        emit AddedRewardBatch(_uuids);
    }

    function setTradeInMinimum(uint256 _lootboxId, uint8 _count) external override checkPermissions(MANAGER_ROLE) checkLootboxExists(_lootboxId) {
        lootbox(_lootboxId).setTradeInMinimum(_count);
    }


    /******** Internal Functions ********/
    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function lootbox(uint256 _lootboxId) internal view returns (ILootbox) {
        return ILootbox(lootboxAddresses[_lootboxId]);
    }
}