// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../craft/Salvage.sol";

contract TestSalvage is Salvage {
    using EnumerableSetUpgradeable for *;

    function getSalvageableAssets(uint256 _id) external view returns(LibCraft.SalvageableAsset memory) {
        return salvageableAssets[_id];
    }
}