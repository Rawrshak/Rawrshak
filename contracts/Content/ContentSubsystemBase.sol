// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165StorageUpgradeable.sol";
import "./interfaces/IContentSubsystemBase.sol";
import "../utils/LibConstants.sol";

abstract contract ContentSubsystemBase is IContentSubsystemBase, ERC165StorageUpgradeable {

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