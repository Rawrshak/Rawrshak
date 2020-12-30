// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/utils/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../interfaces/ICrafting.sol";
import "./Crafting.sol";
import "../interfaces/ICraftingManager.sol";
import "../interfaces/IGlobalItemRegistry.sol";
import "../tokens/TokenBase.sol";
import "../factory/CraftingFactory.sol";

// Todo: Single Game Crafting Contract: more efficient for single game contracts
// Todo: Multi-Game Crafting Contract

contract CraftingManager is ICraftingManager, Ownable, AccessControl, ERC165 {
    using EnumerableSet for EnumerableSet.UintSet;
    using Address for *;
    using ERC165Checker for *;

    /******** Constants ********/
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /*
     *     bytes4(keccak256('isRecipeActive(uint256)')) == 0x4e22a7bd
     *     bytes4(keccak256('getTokenAddressForCrafting()')) == 0x2d7d6043
     *     bytes4(keccak256('getRecipeCost(uint256)')) == 0x7352706d
     *     bytes4(keccak256('getCraftingMaterialsList(uint256)')) == 0x1f728011
     *     bytes4(keccak256('getRewardsList(uint256)')) == 0xb9653829
     *     bytes4(keccak256('getItemAsCraftingMaterialList(uint256)')) == 0xb0d26341
     *     bytes4(keccak256('getItemAsRewardList(uint256)')) == 0x7bb901d1
     *     bytes4(keccak256('getActiveRecipes()')) == 0x345964c9
     *     bytes4(keccak256('getActiveRecipesCount()')) == 0x1564aed9
     *     bytes4(keccak256('createRecipe(uint256[],uint256[],uint256[],uint256[],uin256,bool)')) == 0xc2592024
     *     bytes4(keccak256('setRecipeActive(uin256,bool)')) == 0x26f0021d
     *     bytes4(keccak256('setRecipeActiveBatch(uint256[],bool[])')) == 0x5c5e19b7
     *     bytes4(keccak256('updateRecipeCost(uint256,uint256)')) == 0xfd317879
     *     bytes4(keccak256('updateRecipeCostBatch(uint256[],uint256[])')) == 0x142695d8
     *     bytes4(keccak256('craftItem(uint256,address)')) == 0x66b3f13e
     *
     *     => 0x4e22a7bd ^ 0x2d7d6043 ^ 0x7352706d ^ 0x1f728011
     *      ^ 0xb9653829 ^ 0xb0d26341 ^ 0x7bb901d1 ^ 0x345964c9
     *      ^ 0x1564aed9 ^ 0xc2592024 ^ 0x26f0021d ^ 0x5c5e19b7
     *      ^ 0xfd317879 ^ 0x142695d8 ^ 0x66b3f13e == 0x6b1f803a
     */
    bytes4 private constant _INTERFACE_ID_ICRAFTING = 0x00000005;
    bytes4 private constant _INTERFACE_ID_ICRAFTINGMANAGER= 0x00000006;
    bytes4 private constant _INTERFACE_ID_ICRAFTINGFACTORY = 0x00000007;
    bytes4 private constant _INTERFACE_ID_IGLOBALITEMREGISTRY = 0x00000004;
    bytes4 private constant _INTERFACE_ID_TOKENBASE = 0x00000008;

    /******** Stored Variables ********/
    address public craftingAddr;
    address private itemRegistryAddr;

    /******** Events ********/
    event GlobalItemRegistryStored(address, address, bytes4);

    /******** Modifiers ********/
    modifier checkPermissions(bytes32 _role) {
        require(
            hasRole(_role, msg.sender),
            "Caller does not have the necessary permissions."
        );
        _;
    }
    
    modifier checkCraftingContract() {
        require(craftingAddr != address(0), "Crafting Contract not created yet.");
        _;
    }

    modifier checkRecipeExists(uint256 _recipeId) {
        require(
            crafting().exists(_recipeId),
            "Recipe doesn't exist."
        );
        _;
    }

    /******** Public API ********/
    constructor(address _owner) public {
        // Set up Roles
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(MANAGER_ROLE, _owner);

        _registerInterface(_INTERFACE_ID_ICRAFTINGMANAGER);
        transferOwnership(_owner);
    }

    function setGlobalItemRegistryAddr(address _addr)
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
    {
        require(Address.isContract(_addr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_addr, _INTERFACE_ID_IGLOBALITEMREGISTRY),
            "Caller does not support Interface."
        );
        itemRegistryAddr = _addr;
        crafting().setGlobalItemRegistryAddr(_addr);

        emit GlobalItemRegistryStored(address(this), _addr, _INTERFACE_ID_ICRAFTINGMANAGER);
    }

    function setDeveloperWallet(address payable _wallet) external override checkCraftingContract checkPermissions(MANAGER_ROLE) {
        crafting().setDeveloperWallet(_wallet);
    }

    function generateCraftingContract(
        address _craftingFactoryAddress
    )
        external
        override
        checkPermissions(MANAGER_ROLE)
    {
        require(
            ERC165Checker.supportsInterface(_craftingFactoryAddress, _INTERFACE_ID_ICRAFTINGFACTORY),
            "Caller does not support Interface."
        );

        uint256 id;
        (craftingAddr, id)  = CraftingFactory(_craftingFactoryAddress).createCraftingContract();
    }


    function getCraftingAddress() external view override returns(address) {
        return craftingAddr;
    }

    function createRecipe(
        uint256[] calldata _materialUuids,
        uint256[] calldata _materialAmounts,
        uint256[] calldata _rewardUuids,
        uint256[] calldata _rewardAmounts,
        address _tokenAddr,
        uint256 _cost,
        bool _isActive
    )
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
    {
        require(
            _materialUuids.length == _materialAmounts.length,
            "Materials lists do not match."
        );
        require(
            _rewardUuids.length == _rewardAmounts.length,
            "Rewards lists do not match."
        );
        require(Address.isContract(_tokenAddr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_tokenAddr, _INTERFACE_ID_TOKENBASE),
            "Caller does not support Interface."
        );

        // Validate Items exist
        require(validateItems(_materialUuids), "Item in the materials list does not exist.");
        require(validateItems(_rewardUuids), "Item in the rewards list does not exist.");

        uint256 recipeId = crafting().generateNextRecipeId();

        crafting().createRecipe(recipeId);
        crafting().updateRecipeActive(recipeId, _isActive);
        crafting().updateMaterialsToRecipe(recipeId, _materialUuids, _materialAmounts);
        crafting().updateRewardsToRecipe(recipeId, _rewardUuids, _rewardAmounts);
        crafting().updateRecipeCost(recipeId, _tokenAddr, _cost);
    }

    // Can be used to add and update materials in a specific recipe
    function updateMaterialsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _materialUuids,
        uint256[] calldata _materialAmounts
    )
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
        checkRecipeExists(_recipeId)
    {
        require(_materialUuids.length == _materialAmounts.length, "Input array lengths do not match");

        // Validate Materials UUIDs
        require(validateItems(_materialUuids), "Item in the list does not exist.");

        crafting().updateMaterialsToRecipe(_recipeId, _materialUuids, _materialAmounts);
    }

    // Can be used to add and update rewards in a specific recipe
    function updateRewardsToRecipe(
        uint256 _recipeId,
        uint256[] calldata _rewardUuids,
        uint256[] calldata _rewardAmounts
    )
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
        checkRecipeExists(_recipeId)
    {
        require(_rewardUuids.length == _rewardAmounts.length, "Input array lengths do not match");

        // Validate Rewards UUIDs
        require(validateItems(_rewardUuids), "Item in the list does not exist.");

        crafting().updateRewardsToRecipe(_recipeId, _rewardUuids, _rewardAmounts);
    }

    function updateRecipeActive(uint256 _recipeId, bool _activate) 
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
        checkRecipeExists(_recipeId)
    {
        crafting().updateRecipeActive(_recipeId, _activate);
    }

    function updateRecipeActiveBatch(uint256[] calldata _recipeIds, bool[] calldata _activates)
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
    {
        require(_recipeIds.length == _activates.length, "Input array lengths do not match");

        // check recipe exists
        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            require(crafting().exists(_recipeIds[i]), "Recipe doesn't exist.");
        }

        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            crafting().updateRecipeActive(_recipeIds[i], _activates[i]);
        }
    }

    function updateRecipeCost(uint256 _recipeId, address _tokenAddr, uint256 _cost)
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
        checkRecipeExists(_recipeId)
    {
        require(Address.isContract(_tokenAddr), "Address not valid");
        require(
            ERC165Checker.supportsInterface(_tokenAddr, _INTERFACE_ID_TOKENBASE),
            "Caller does not support Interface."
        );
        crafting().updateRecipeCost(_recipeId, _tokenAddr, _cost);
    }

    function updateRecipeCostBatch(uint256[] calldata _recipeIds, address[] calldata _tokenAddrs, uint256[] calldata _costs)
        external
        override
        checkCraftingContract
        checkPermissions(MANAGER_ROLE)
    {
        require(_recipeIds.length == _costs.length, "Input array lengths do not match");
        require(_tokenAddrs.length == _costs.length, "Input array lengths do not match");

        // do necessary checks
        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            require(crafting().exists(_recipeIds[i]), "Recipe doesn't exist.");
            require(Address.isContract(_tokenAddrs[i]), "Address not valid");
            require(
                ERC165Checker.supportsInterface(_tokenAddrs[i], _INTERFACE_ID_TOKENBASE),
                "Caller does not support Interface."
            );
        }

        for (uint256 i = 0; i < _recipeIds.length; ++i) {
            crafting().updateRecipeCost(_recipeIds[i], _tokenAddrs[i], _costs[i]);
        }
    }


    /******** Internal Functions ********/
    function validateItems(uint256[] memory items) internal view returns(bool)
    {
        for (uint256 i = 0; i < items.length; ++i) {
            if(!itemRegistry().contains(items[i])) {
                return false;
            }
        }
        return true;
    }

    function itemRegistry() internal view returns (IGlobalItemRegistry) {
        return IGlobalItemRegistry(itemRegistryAddr);
    }

    function crafting() internal view returns(ICrafting) {
        return ICrafting(craftingAddr);
    }
}