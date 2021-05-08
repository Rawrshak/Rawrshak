// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../craft/Salvage.sol";

contract TestSalvage is Salvage {
    using EnumerableSetUpgradeable for *;

    function __TestSalvage_init(uint256 _seed) external initializer {
        __Salvage_init(_seed);
    }

    function getSalvageableAssets(uint256 _id) external view returns(LibCraft.SalvageableAsset memory) {
        return salvageableAssets[_id];
    }
}