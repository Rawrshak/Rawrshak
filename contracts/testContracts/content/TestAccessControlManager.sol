// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../content/AccessControlManager.sol";

contract TestAccessControlManager is AccessControlManager {
    using ECDSAUpgradeable for bytes32;

    function __TestAccessControlManager_init() external initializer {
        __AccessControlManager_init();
    }

    function recover(LibAsset.MintData memory _data) external view returns(address) {
        bytes32 hashData = _hashTypedDataV4(LibAsset.hashMintData(_data));
        return hashData.recover(_data.signature);
    }
}