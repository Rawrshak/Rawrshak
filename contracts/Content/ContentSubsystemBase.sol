// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/IContentSubsystemBase.sol";
import "../utils/LibConstants.sol";

abstract contract ContentSubsystemBase is IContentSubsystemBase, ERC165StorageUpgradeable {

    /******************** Constants ********************/
    /*
     * bytes4(keccak256('parent()')) == 0x60f96a8f
     * bytes4(keccak256('setParent(address)')) == 0x1499c592
     * bytes4(keccak256('transferOwnership()')) == 0x880ad0af
     */
    // bytes4 private constant _INTERFACE_ID_CONTENT_SUBSYSTEM_BASE = 0xFC6A7FB2;

    /***************** Stored Variables *****************/
    address contentParent;

    /******************** Public API ********************/
    function __ContentSubsystemBase_init_unchained() internal initializer {
        _registerInterface(LibConstants._INTERFACE_ID_CONTENT_SUBSYSTEM_BASE);
    }

    function setParent(address) external virtual override {
        // No-op
    }

    function parent() external view override returns (address) {
        return _parent();
    }
    
    function _setParent(address _contentParent) internal {
        contentParent = _contentParent;
    }

    function _parent() internal view returns(address) {
        return contentParent;
    }
}