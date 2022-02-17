// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@rawrshak/rawr-token/contracts/optimism/L2NativeRawrshakERC20Token.sol";
import "../content/interfaces/IContent.sol";
import "./StorageBase.sol";
import "./interfaces/ILootbox.sol";
import "./interfaces/ILootboxStorageByItem.sol";
import "../libraries/LibLootbox.sol";
import "hardhat/console.sol";

contract LootboxByItem is ILootbox, ERC1155Upgradeable, AccessControlUpgradeable, ERC165StorageUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, StorageBase {
    using AddressUpgradeable for address;
    using LibLootbox for *;
    using SafeMathUpgradeable for uint256;

    /******************** Constants ********************/
    
    /***************** Stored Variables *****************/
    // Seed for random number generator.
    uint256 internal seed;

    // Id for the lootbox credit ERC20 token.
    address internal lootboxCreditAddress;

    // Lootbox data storage class.
    ILootboxStorageByItem dataStorage;
    
    /******************** Public API ********************/
    function initialize(
        uint256 _seed, 
        address _lootboxCreditAddress, 
        address _lootboxStorageAddress
    ) public initializer {
         __AccessControl_init_unchained();
        __ERC165Storage_init_unchained();
        __Pausable_init_unchained();
        __ReentrancyGuard_init_unchained();
        __StorageBase_init_unchained();
        _registerInterface(type(ILootbox).interfaceId);

        seed = _seed;
        lootboxCreditAddress = _lootboxCreditAddress;
        dataStorage = ILootboxStorageByItem(_lootboxStorageAddress);
    }

    function registerStorage(address _storage) external override checkPermissions(DEFAULT_ADMIN_ROLE) {
        dataStorage = ILootboxStorageByItem(_storage);
        emit StorageRegistered(msg.sender, _storage);
    }

    function managerSetPause(bool _setPause) external override checkPermissions(MANAGER_ROLE) {
        if (_setPause) {
            _pause();
        } else {
            _unpause();
        }
    }

    // Mints new lootbox(es) and sends to the caller.
    function mint(uint256 _tokenId, uint256 _amount) external override nonReentrant whenNotPaused {
        // 1) Make sure the user has enough LootboxCredit to mint this lootbox.
        uint256 cost = dataStorage.getCost(_tokenId);
        require(cost != 0, "Zero cost");
        cost = SafeMathUpgradeable.mul(cost, _amount);
        require(L2NativeRawrshakERC20Token(lootboxCreditAddress).balanceOf(msg.sender) >= cost, "Not enough credit");

        bool enabled = dataStorage.getEnabled(_tokenId);
        require(enabled, "Lootbox not enabled");

        // 2) Grab the required LootboxCredit amount from the user and burn it.
        IL2StandardERC20Latest(lootboxCreditAddress).burn(msg.sender, cost);

        // 3) Send the lootbox(es) to the caller.
        _mint(msg.sender, _tokenId, _amount, "");

        emit LootboxCreated(msg.sender, _tokenId, _amount);
    }

    // Burns a lootbox and sends any rewards within to the caller.
    function burn(uint256 _tokenId) external override nonReentrant whenNotPaused {
        LibLootbox.Blueprint memory blueprint = dataStorage.getBlueprint(_tokenId);
        require(blueprint.enabled, "Lootbox not enabled");

        LibLootbox.LootboxReward[] memory rewards = dataStorage.getRewards(_tokenId);
        
        uint16 numTotalAssetsGiven = 0;
        uint16 maxAssetsGiven = blueprint.maxAssetsGiven;

        if(blueprint.hasGuaranteedItems) {
            for (uint256 i = 0; i < rewards.length; ++i) {
                if(rewards[i].probability >= 1000000) {
                    LibAsset.MintData memory mintData;
                    mintData.to = msg.sender;
                    mintData.tokenIds = new uint256[](1);
                    mintData.amounts = new uint256[](1);
                    mintData.tokenIds[0] = rewards[i].asset.tokenId;
                    mintData.amounts[0] = rewards[i].amount;
                    IContent(rewards[i].asset.content).mintBatch(mintData);

                    numTotalAssetsGiven++;
                }
            }   
        }

        for (uint256 i = 0; i < rewards.length; ++i) {
            if(numTotalAssetsGiven >= maxAssetsGiven) {
                break;
            }

            // Don't double count guaranteed items.
            if(rewards[i].probability < 1000000) {
                uint256 randomVal = LibLootbox.random(msg.sender, seed);
                if (randomVal.mod(1000000) <= rewards[i].probability) {
                    LibAsset.MintData memory mintData;
                    mintData.to = msg.sender;
                    mintData.tokenIds = new uint256[](1);
                    mintData.amounts = new uint256[](1);
                    mintData.tokenIds[0] = rewards[i].asset.tokenId;
                    mintData.amounts[0] = rewards[i].amount;
                    IContent(rewards[i].asset.content).mintBatch(mintData);

                    numTotalAssetsGiven++;
                }
            }
        }
        
        // Last but not least, burn our lootbox.
        _burn(msg.sender, _tokenId, 1);

        emit LootboxOpened(msg.sender, _tokenId, numTotalAssetsGiven);
    }

    // Interface support
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155Upgradeable, IERC165Upgradeable, ERC165StorageUpgradeable, AccessControlUpgradeable, StorageBase) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /**************** Internal Functions ****************/

    uint256[50] private __gap;
}