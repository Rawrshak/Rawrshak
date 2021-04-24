// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

// import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
// import "../libraries/LibRoyalties.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";
import "../utils/LibConstants.sol";

library LibSalvage {
    using AddressUpgradeable for address;
    using ERC165CheckerUpgradeable for address;

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

    function verify(SalvageableAsset memory _asset) internal view {
        require(_asset.asset.content.isContract(), "Content address is not an contract");
        require(_asset.asset.content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Token contract is not a Content Contract");
        require(_asset.rewards.length > 0, "Invalid rewards length.");

        for (uint256 i = 0; i < _asset.rewards.length; ++i) {
            require(_asset.rewards[i].asset.content.isContract(), "Content address is not an contract");
            require(_asset.rewards[i].asset.content.supportsInterface(LibConstants._INTERFACE_ID_CONTENT), "Token contract is not a Content Contract");
            require(_asset.rewards[i].probability > 0 && _asset.rewards[i].probability < 10000, "Invalid probability.");
            require(_asset.rewards[i].amount > 0, "Invalid reward amount.");
        }
    }

}