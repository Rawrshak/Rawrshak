// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "../../content/SystemsRegistry.sol";

contract TestSystemsRegistry is SystemsRegistry {
    using ECDSAUpgradeable for bytes32;

    function __TestSystemsRegistry_init() external initializer {
        __SystemsRegistry_init();
    }

    function recover(LibAsset.MintData memory _data) external view returns(address) {
        bytes32 hashData = _hashTypedDataV4(LibAsset.hashMintData(_data));
        return hashData.recover(_data.signature);
    }
}