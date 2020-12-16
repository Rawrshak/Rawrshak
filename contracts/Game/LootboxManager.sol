// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/EnumerableMap.sol";
import "./Lootbox.sol";
import "../factory/LootboxFactory.sol";
import "../interfaces/ILootbox.sol";
import "../interfaces/ILootboxManager.sol";
import "../interfaces/IGlobalItemRegistry.sol";

contract LootboxManager is AccessControl, Ownable, ILootboxManager, ERC165 {
    using ERC165Checker for *;
    using EnumerableMap for *;

    /******** Constant ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes4 private constant _INTERFACE_ID_ILOOTBOXMANAGER = 0x0000000A; // Todo:
    bytes4 private constant _INTERFACE_ID_ILOOTBOXFACTORY = 0x0000000B;
    bytes4 private constant _INTERFACE_ID_ILOOTBOX = 0x00000009; // Todo:
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    
    /******** Stored Variables ********/
    address globalItemRegistryAddr;
    EnumerableMap.UintToAddressMap lootboxAddresses;

    /******** Events ********/
    event LootboxContractCreated(address, address, uint256);
    event GlobalItemRegistryStored(address, address, bytes4);

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
        require(lootboxAddresses.contains(_lootboxId), "Lootbox does not exist.");
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
        require(lootboxAddresses.length() != 0, "Crafting Contract not created yet.");
        globalItemRegistryAddr = _addr;

        // Iterate through the map and set the global item registry for all of them
        for (uint256 i = 0; i < lootboxAddresses.length(); ++i) {
            (, address lootboxAddr) = lootboxAddresses.at(i);
            ILootbox(lootboxAddr).setGlobalItemRegistryAddr(_addr);
        }
        emit GlobalItemRegistryStored(address(this), _addr, _INTERFACE_ID_ILOOTBOXMANAGER);
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
        
        (address lootboxAddr, uint256 lootboxId)  = LootboxFactory(_lootboxFactoryAddress).createLootboxContract(_url);
        lootboxAddresses.set(lootboxId, lootboxAddr);
        
        emit LootboxContractCreated(address(this), lootboxAddr, lootboxId);
    }

    function getLootboxAddress(uint256 _lootboxId) external view override checkLootboxExists(_lootboxId) returns(address) {
        return lootboxAddresses.get(_lootboxId);
    }

    function registerInputItem(uint256 _lootboxId, uint256 _uuid, uint256 _amount, uint256 _multiplier)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
        checkItemExists(_uuid)
    {
        lootbox(_lootboxId).registerInputItem(_uuid, _amount, _multiplier);
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
    }

    function registerReward(uint256 _lootboxId, uint256 _uuid, Rarity _rarity, uint256 _amount)
        external
        override
        checkPermissions(MANAGER_ROLE)
        checkLootboxExists(_lootboxId)
        checkItemExists(_uuid)
    {
        lootbox(_lootboxId).registerReward(_uuid, _rarity, _amount);
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
    }

    function setTradeInMinimum(uint256 _lootboxId, uint8 _count) external override checkPermissions(MANAGER_ROLE) checkLootboxExists(_lootboxId) {
        lootbox(_lootboxId).setTradeInMinimum(_count);
    }


    /******** Internal Functions ********/
    function globalItemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(globalItemRegistryAddr);
    }
    
    function lootbox(uint256 _lootboxId) internal view returns (ILootbox) {
        return ILootbox(lootboxAddresses.get(_lootboxId));
    }
}