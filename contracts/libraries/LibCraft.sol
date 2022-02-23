// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "./LibLootbox.sol";

library LibCraft {
    using SafeMathUpgradeable for uint256;
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

    struct SalvageOutput {
        AssetData asset;
        uint24  probability;
        uint256 amount;
    }

    struct SalvageableAsset {
        AssetData asset;
        uint256 salvageType;                            // Todo: maybe make this an enum
        SalvageOutput[] outputs;                        // ERC1155  to potentially be minted (based on probability).
        LibLootbox.LootboxCreditReward lootboxCredits;  // This needs to be separate from the rewards because the rewards are ERC1155 and credit is ERC20.
    }

    struct Recipe {
        uint24 craftingRate;
        bool enabled;
        AssetData[] materials;
        uint256[] materialAmounts;
        AssetData[] rewards;
        uint256[] rewardAmounts;
    }

    function hashAssetId(AssetData memory _asset) internal pure returns(uint256) {
        return uint256(keccak256(abi.encodePacked(_asset.content, _asset.tokenId)));
    }

    function verifySalvageableAsset(SalvageableAsset memory _asset) internal pure {
        // No need to check the validity of the contract. All registered contracts are Content contracts. If we get
        // here, it means we've verified the asset and output assets correctly.
        require(_asset.salvageType < uint256(SalvageType.Max), "Error: Invalid Salvage Type");
        for (uint256 i = 0; i < _asset.outputs.length; ++i) {
            require(_asset.outputs[i].probability > 0 && _asset.outputs[i].probability <= 1e6, "Error: Invalid probability");
            require(_asset.outputs[i].amount > 0, "Error: Invalid output amount");
            require(_asset.outputs[i].asset.content != address(0), "Error: Invalid content address");
        }

        // Check validity of the lootbox credit asset. If it was set as this is optional.
        if(_asset.lootboxCredits.tokenAddress != address(0))
        {
            LibLootbox.verifyLootboxCreditReward(_asset.lootboxCredits);
        }
    }

    function random(address _sender, uint256 _seed) internal view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(blockhash(block.number - 1), _sender, _seed)));
    }
}