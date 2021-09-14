// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "../utils/LibConstants.sol";

library LibCraft {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

    enum SalvageType {
        Guarantee,
        Random,
        Max
    }

    struct AssetData {
        address content;
        uint256 tokenId;
    }

    struct SalvageReward {
        AssetData asset;
        uint256 probability;
        uint256 amount;
    }

    struct SalvageableAsset {
        AssetData asset;
        uint256 salvageType; // Todo: maybe make this an enum
        SalvageReward[] rewards;
    }

    struct Recipe {
        uint256 craftingRate;
        bool enabled;
        AssetData[] materials;
        uint256[] materialAmounts;
        AssetData[] rewards;
        uint256[] rewardAmounts;
    }

    function verifySalvageableAsset(SalvageableAsset memory _asset) internal pure {
        // No need to check the validity of the contract. All registered contracts are Content contracts. If we get
        // here, it means we've verified the asset and reward assets correctly.
        require(_asset.rewards.length > 0, "Invalid rewards length.");
        require(_asset.salvageType < uint256(SalvageType.Max), "Invalid Salvage Type");
        for (uint256 i = 0; i < _asset.rewards.length; ++i) {
            require(_asset.rewards[i].probability > 0 && _asset.rewards[i].probability <= 1 ether, "Invalid probability.");
            require(_asset.rewards[i].amount > 0, "Invalid reward amount.");
        }
    }

    function salvage(SalvageableAsset storage _asset, uint256 rolls) internal view returns(SalvageReward[] memory materials, uint256[] memory amounts) {
        // guarantee
        if (SalvageType(_asset.salvageType) == SalvageType.Guarantee) {
            materials = _asset.rewards;
            amounts = new uint256[](_asset.rewards.length);
            for (uint256 i = 0; i < _asset.rewards.length; ++i) {
                amounts[i] = _asset.rewards[i].amount * rolls;
            }
        }
        // } else if (SalvageType(_asset.salvageType) == SalvageType.Random) {
        //     // todo: Random 
        // }
    }

    function random(address _sender, uint256 _seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), _sender, _seed)));
    }
}